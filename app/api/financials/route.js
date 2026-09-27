import { NextResponse } from "next/server";
import { runQuery } from "../lib/bigquery";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const property = searchParams.get("property");

    const trendFilterClause =
      property && property !== "All Properties"
        ? `WHERE c.property_id IN (SELECT DISTINCT property_id FROM \`__PROJECT__.__DATASET__.dim_properties\` WHERE property_name = @property)`
        : `WHERE 1=1`;

    const baseFilterClause =
      property && property !== "All Properties"
        ? `WHERE property_id IN (SELECT DISTINCT property_id FROM \`__PROJECT__.__DATASET__.dim_properties\` WHERE property_name = @property)`
        : `WHERE 1=1`;

    // 1. Time-Series Trend Query with Embedded Audit Anomaly Detection Deltas
    const trendQuery = `
      WITH CalculatedMetrics AS (
        SELECT
          property_id,
          period_date,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as calc_revenue,
          SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as calc_opex,
          SUM(amount) as calc_cash_flow
        FROM \`__PROJECT__.__DATASET__.fact_t12_entries\`
        GROUP BY property_id, period_date
      ),
      ReportedMetrics AS (
        SELECT
          property_id,
          period_date,
          MAX(CASE WHEN UPPER(raw_total_label) IN ('TOTAL REVENUES', 'TOTAL INCOME') THEN reported_amount END) as reported_revenue,
          MAX(CASE WHEN UPPER(raw_total_label) IN ('NET OPERATING INCOME', 'NET OPERATING INCOME (LOSS)') THEN reported_amount END) as reported_noi,
          COALESCE(
            MAX(CASE WHEN UPPER(raw_total_label) IN ('NET CASH FLOW', 'NET INCOME (LOSS) AFTER OTHER CASH', 'NET CASH FLOW') THEN reported_amount END),
            MAX(CASE WHEN UPPER(raw_total_label) IN ('NET OPERATING INCOME', 'NET OPERATING INCOME (LOSS)') THEN reported_amount END)
          ) as reported_net_cash_flow,
          MAX(CASE WHEN UPPER(raw_total_label) IN ('TOTAL OPERATING EXPENSES', 'TOTAL EXPENSE', 'TOTAL OPERATING EXPENSE') THEN reported_amount END) as reported_opex
        FROM \`__PROJECT__.__DATASET__.fact_audit_totals\`
        GROUP BY property_id, period_date
      )
      SELECT
        c.period_date,
        SUM(c.calc_revenue) as revenue,
        SUM(COALESCE(r.reported_opex, c.calc_revenue - r.reported_noi, ABS(c.calc_opex))) as expenses,
        SUM(IFNULL(r.reported_noi, c.calc_revenue + c.calc_opex)) as net_operating_income,
        SUM(ABS(IFNULL(r.reported_noi, c.calc_revenue + c.calc_opex) - c.calc_cash_flow)) as capex,
        SUM(ROUND(c.calc_cash_flow - IFNULL(r.reported_net_cash_flow, 0), 2)) as audit_anomaly_delta,
        SUM(IFNULL(r.reported_net_cash_flow, c.calc_cash_flow)) as net_cash_flow
      FROM CalculatedMetrics c
      LEFT JOIN ReportedMetrics r 
        ON c.property_id = r.property_id AND c.period_date = r.period_date
      ${trendFilterClause}
      GROUP BY c.period_date
      ORDER BY c.period_date ASC
    `;

    // 2. Expense Breakdown Donut Query with Inline Categorization mapping
    const donutQuery = `
      SELECT
        CASE 
          WHEN REGEXP_CONTAINS(UPPER(raw_description), 'SALAR|WAG|PAYROLL|BONUS|COMMISS|BENEFIT|5200|5202|5204|5205|5206|5208|5210|5212|5214') THEN 'Payroll'
          WHEN REGEXP_CONTAINS(UPPER(raw_description), 'UTILITY|ELECTRIC|WATER|SEWER|GAS|STORMWATER|5402|5404|5410|5412|5416') THEN 'Utilities'
          WHEN REGEXP_CONTAINS(UPPER(raw_description), 'MGMT|MANAGEMENT|5914') THEN 'Management Fees'
          WHEN REGEXP_CONTAINS(UPPER(raw_description), 'MARKET|ADVERT|INTERNET ADS|LEAD|RETENTION|LOCATOR|SOCIAL MEDIA|WEBSITE|5102|5106|5110|5112|5114|5118|5911|5912') THEN 'Marketing'
          WHEN REGEXP_CONTAINS(UPPER(raw_description), 'TAX|INSUR|RLIP|FRANCHISE|5800|5802|5803|5915|5033|4181') THEN 'Taxes & Insurance'
          WHEN REGEXP_CONTAINS(UPPER(raw_description), 'MAINT|REPAIR|ROOF|HVAC|CLEAN|PLUMB|ELEC|HARDWARE|SHEETROCK|LOCK|APPLIANC|POOL|PAINT|HOUSEKEEP|CARPET|RESURF|MAKE READY|TRASH|PEST|LANDSCAP|PATROL|ALARM|SNOW|5700|5704|5706|5708|5710|5712|5718|5724|5728|5731|5732|5734|5736|5738|5742|5746|5748|5750|5752|5754|5756|5762|5764|5768|5770|5772|5774|5776|5781|5600|5602|5604|5606|5608|5610|5614|5616|5618|5500|5501|5502|5503|5504|5505|5506|5507|5508|5510|5514|5520|5722') THEN 'Maintenance'
          ELSE 'Administrative & Other'
        END as name,
        ABS(SUM(amount)) as value
      FROM \`__PROJECT__.__DATASET__.fact_t12_entries\`
      ${baseFilterClause} AND amount < 0
      GROUP BY name
    `;

    // 3. Service 1 Summary Insights Query targeting Value Leaks
    const summaryQuery = `
      SELECT
        SUM(CASE WHEN REGEXP_CONTAINS(UPPER(raw_description), 'RENT|MARKET RENTAL') AND NOT REGEXP_CONTAINS(UPPER(raw_description), 'CONCESSION|VACANCY') THEN amount ELSE 0 END) as gross_market_rent,
        ABS(SUM(CASE WHEN REGEXP_CONTAINS(UPPER(raw_description), 'CONCESSION|DISCOUNT') THEN amount ELSE 0 END)) as total_concessions,
        ABS(SUM(CASE WHEN REGEXP_CONTAINS(UPPER(raw_description), 'VACANCY') THEN amount ELSE 0 END)) as vacancy_losses,
        ABS(SUM(CASE WHEN REGEXP_CONTAINS(UPPER(raw_description), 'BAD DEBT|WRITE OFF') THEN amount ELSE 0 END)) as bad_debt,
        SUM(CASE WHEN REGEXP_CONTAINS(UPPER(raw_description), 'REIMB|BILL BACK|UTILITY INCOME') THEN amount ELSE 0 END) as rubs_collected,
        ABS(SUM(CASE WHEN REGEXP_CONTAINS(UPPER(raw_description), 'UTILITY|ELECTRIC|WATER|SEWER|GAS|TRASH') AND amount < 0 THEN amount ELSE 0 END)) as total_utility_expense
      FROM \`__PROJECT__.__DATASET__.fact_t12_entries\`
      ${baseFilterClause}
    `;

    const queryOptions = {
      params: property ? { property } : {},
    };

    let leaderboardRows = [];
    if (!property || property === "All Properties") {
      const leaderboardQuery = `
        WITH CalculatedRevenue AS (
          SELECT
            property_id,
            SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as revenue
          FROM \`__PROJECT__.__DATASET__.fact_t12_entries\`
          GROUP BY property_id
        )
        SELECT
          p.property_name,
          r.revenue
        FROM CalculatedRevenue r
        JOIN \`__PROJECT__.__DATASET__.dim_properties\` p ON r.property_id = p.property_id
        ORDER BY revenue DESC
      `;
      leaderboardRows = await runQuery(leaderboardQuery, queryOptions);
    }

    const trendRows = await runQuery(trendQuery, queryOptions);
    const donutRows = await runQuery(donutQuery, queryOptions);
    const summaryRows = await runQuery(summaryQuery, queryOptions);

    return NextResponse.json({
      trend: trendRows,
      donut: donutRows,
      leaderboard: leaderboardRows,
      summary: summaryRows[0] || {
        gross_market_rent: 0,
        total_concessions: 0,
        vacancy_losses: 0,
        bad_debt: 0,
        rubs_collected: 0,
        total_utility_expense: 0,
      },
    });
  } catch (error) {
    console.error("Financials API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
