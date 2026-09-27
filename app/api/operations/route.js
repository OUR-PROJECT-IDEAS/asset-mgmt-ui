import { NextResponse } from "next/server";
import { runQuery } from "../lib/bigquery";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get("rentRollId");

    // 1. Fetch available rent rolls + Property Name (with COALESCE fallback)
    const metaQuery = `
      SELECT DISTINCT
        mrr.rent_roll_id,
        CAST(mrr.as_of_date AS STRING) as as_of_date,
        COALESCE(dp.property_name, mrr.property_id) as property_name
      FROM \`__PROJECT__.__DATASET__.meta_rent_rolls\` mrr
      LEFT JOIN \`__PROJECT__.__DATASET__.dim_properties\` dp
        ON mrr.property_id = dp.property_id
      ORDER BY as_of_date DESC, rent_roll_id DESC
    `;

    const metaRows = await runQuery(metaQuery);
    const availableRolls = (metaRows || []).map((r) => ({
      id: r.rent_roll_id,
      date: r.as_of_date,
      propertyName: r.property_name || `File: ${r.batch_id || "Unknown"}`,
    }));

    // 2. Adjust main query dynamically
    const idFilter =
      requestedId && requestedId !== "latest"
        ? `rre.rent_roll_id = ${parseInt(requestedId)}`
        : `1=1`;

    const query = `
      WITH LatestValidRentRoll AS (
        SELECT 
          rre.rent_roll_id, 
          mrr.as_of_date, 
          mrr.batch_id, 
          COALESCE(dp.property_name, mrr.property_id) as property_name
        FROM \`__PROJECT__.__DATASET__.fact_rent_roll_entries\` rre
        JOIN \`__PROJECT__.__DATASET__.meta_rent_rolls\` mrr ON rre.rent_roll_id = mrr.rent_roll_id
        LEFT JOIN \`__PROJECT__.__DATASET__.dim_properties\` dp ON mrr.property_id = dp.property_id
        WHERE rre.is_audit_row = FALSE
          AND rre.unit_number IS NOT NULL
          AND rre.unit_number != ''
          AND ${idFilter}
        GROUP BY rre.rent_roll_id, mrr.as_of_date, mrr.batch_id, property_name
        ORDER BY mrr.as_of_date DESC, rre.rent_roll_id DESC
        LIMIT 1
      ),
      PivotedData AS (
        SELECT
          rre.unit_number as unit,
          MAX(CASE WHEN rre.raw_column_name = 'Unit Type' THEN rre.cell_value END) as unit_type,
          MAX(CASE WHEN rre.raw_column_name = 'Resident Name' THEN rre.cell_value END) as resident_name,
          MAX(CASE WHEN rre.raw_column_name = 'Unit Status' THEN rre.cell_value END) as unit_status,
          MAX(CASE WHEN rre.raw_column_name IN ('Scheduled Rent', 'Actual Rent') THEN SAFE_CAST(rre.cell_value AS NUMERIC) END) as actual_rent,
          MAX(CASE WHEN rre.raw_column_name = 'Market Rent' THEN SAFE_CAST(rre.cell_value AS NUMERIC) END) as market_rent,
          MAX(CASE WHEN rre.raw_column_name = 'Balance' THEN SAFE_CAST(rre.cell_value AS NUMERIC) END) as balance,
          MAX(CASE WHEN rre.raw_column_name = 'Move-In Date' THEN rre.cell_value END) as move_in,
          MAX(CASE WHEN rre.raw_column_name = 'Lease End' THEN rre.cell_value END) as lease_end
        FROM \`__PROJECT__.__DATASET__.fact_rent_roll_entries\` rre
        JOIN LatestValidRentRoll lv ON rre.rent_roll_id = lv.rent_roll_id
        WHERE rre.is_audit_row = FALSE AND rre.unit_number IS NOT NULL AND rre.unit_number != ''
        GROUP BY rre.unit_number
      )
      SELECT pd.*, lv.rent_roll_id, CAST(lv.as_of_date AS STRING) as meta_as_of_date, lv.batch_id, lv.property_name
      FROM PivotedData pd
      CROSS JOIN LatestValidRentRoll lv
      ORDER BY pd.unit ASC;
    `;

    const rows = await runQuery(query);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ meta: { hasData: false, availableRolls } });
    }

    // Advanced Metrics Trackers
    let totalActualRent = 0;
    let totalMarketRent = 0;
    let totalBalance = 0;
    let trueOccupiedCount = 0;
    let nonRevCount = 0;
    let mtmCount = 0;

    const unitMixMap = {};
    const moveInTrendMap = {};
    const expirationsMap = {
      "0-30 Days": { units: 0, rentAtRisk: 0 },
      "31-60 Days": { units: 0, rentAtRisk: 0 },
      "61-90 Days": { units: 0, rentAtRisk: 0 },
      "90+ Days": { units: 0, rentAtRisk: 0 },
    };

    const today = new Date();
    const parseNum = (val) => parseFloat(val?.value || val) || 0;

    const tenants = rows.map((row) => {
      const actRent = parseNum(row.actual_rent);
      const mktRent = parseNum(row.market_rent);
      const rent = actRent > 0 ? actRent : mktRent;
      const bal = parseNum(row.balance);

      const uType = row.unit_type?.toString() || "Unknown";
      const resName = (row.resident_name || "").toString().trim().toLowerCase();
      const uStatus = (row.unit_status || "").toString().trim().toLowerCase();

      const isNonRev =
        uStatus.includes("down") ||
        uStatus.includes("model") ||
        uStatus.includes("admin") ||
        uStatus.includes("employee") ||
        resName.includes("model");
      const isOccupied =
        !isNonRev &&
        resName !== "" &&
        resName !== "vacant" &&
        !uStatus.includes("vacant");

      totalActualRent += rent;
      totalMarketRent += mktRent > 0 ? mktRent : rent;
      totalBalance += bal;

      if (isNonRev) nonRevCount++;
      else if (isOccupied) trueOccupiedCount++;

      if (!unitMixMap[uType])
        unitMixMap[uType] = { name: uType, count: 0, totalRent: 0 };
      unitMixMap[uType].count++;
      unitMixMap[uType].totalRent += rent;

      let moveInRaw = row.move_in?.value || row.move_in;
      if (isOccupied && moveInRaw) {
        const d = new Date(moveInRaw);
        if (!isNaN(d)) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          moveInTrendMap[monthKey] = (moveInTrendMap[monthKey] || 0) + 1;
        }
      }

      let leaseEndRaw = row.lease_end?.value || row.lease_end;
      if (isOccupied && leaseEndRaw) {
        const leaseDate = new Date(leaseEndRaw);
        const daysUntilExpiry = Math.ceil(
          (leaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntilExpiry < 0)
          mtmCount++;
        else if (daysUntilExpiry <= 30) {
          expirationsMap["0-30 Days"].units++;
          expirationsMap["0-30 Days"].rentAtRisk += rent;
        } else if (daysUntilExpiry <= 60) {
          expirationsMap["31-60 Days"].units++;
          expirationsMap["31-60 Days"].rentAtRisk += rent;
        } else if (daysUntilExpiry <= 90) {
          expirationsMap["61-90 Days"].units++;
          expirationsMap["61-90 Days"].rentAtRisk += rent;
        } else {
          expirationsMap["90+ Days"].units++;
          expirationsMap["90+ Days"].rentAtRisk += rent;
        }
      }

      return {
        unit: row.unit || "N/A",
        tenant: isNonRev
          ? `[NON-REV] ${row.resident_name || uStatus}`
          : row.resident_name || "Vacant",
        moveIn: moveInRaw || "N/A",
        leaseEnd: leaseEndRaw || "N/A",
        balance: bal,
        rent: rent,
      };
    });

    const revenueUnits = rows.length - nonRevCount;
    const physOcc =
      revenueUnits > 0 ? (trueOccupiedCount / revenueUnits) * 100 : 0;
    const econOcc =
      totalMarketRent > 0 ? (totalActualRent / totalMarketRent) * 100 : 0;
    const lossToLease = totalMarketRent - totalActualRent;

    const unitMix = Object.values(unitMixMap).map((u) => ({
      name: u.name,
      units: u.count,
      avgRent: u.totalRent / u.count,
    }));
    const expirations = Object.keys(expirationsMap).map((key) => ({
      name: key,
      ...expirationsMap[key],
    }));
    const topDelinquencies = [...tenants]
      .filter((t) => t.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    const moveInTrend = Object.keys(moveInTrendMap)
      .sort()
      .slice(-12)
      .map((k) => {
        const [y, m] = k.split("-");
        return {
          name: `${new Date(y, m - 1).toLocaleString("default", { month: "short" })} ${y.slice(2)}`,
          moveIns: moveInTrendMap[k],
        };
      });

    return NextResponse.json({
      meta: {
        rentRollId: rows[0].rent_roll_id,
        asOfDate: rows[0].meta_as_of_date,
        batchId: rows[0].batch_id,
        propertyName: rows[0].property_name || "Unknown Property",
        hasData: true,
        availableRolls,
      },
      kpis: {
        totalUnits: rows.length,
        revenueUnits,
        nonRevCount,
        occupancyRate: physOcc,
        economicOccupancy: econOcc,
        vacantUnits: revenueUnits - trueOccupiedCount,
        totalActualRent,
        totalMarketRent,
        lossToLease,
        totalBalance,
        mtmCount,
        delinquencyRatio:
          totalActualRent > 0 ? (totalBalance / totalActualRent) * 100 : 0,
      },
      unitMix,
      expirations,
      tenants,
      topDelinquencies,
      moveInTrend,
    });
  } catch (error) {
    console.error("Operations API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
