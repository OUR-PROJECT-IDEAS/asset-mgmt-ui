import { NextResponse } from "next/server";
import { runQuery } from "../lib/bigquery";

export async function GET() {
  try {
    // Attempt fetching properties from vw_dashboard_financials or dim_properties
    let query = `
      SELECT DISTINCT property_name
      FROM \`__PROJECT__.__DATASET__.vw_dashboard_financials\`
      WHERE property_name IS NOT NULL
      ORDER BY property_name ASC
    `;

    let rows;
    try {
      rows = await runQuery(query);
    } catch (err) {
      console.warn("vw_dashboard_financials query failed, falling back to dim_properties:", err.message);
      query = `
        SELECT DISTINCT property_name
        FROM \`__PROJECT__.__DATASET__.dim_properties\`
        WHERE property_name IS NOT NULL
        ORDER BY property_name ASC
      `;
      rows = await runQuery(query);
    }

    return NextResponse.json(rows || []);
  } catch (error) {
    console.error("Properties API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
