import { BigQuery } from "@google-cloud/bigquery";
import { NextResponse } from "next/server";

const bigquery = new BigQuery();

export async function GET() {
  try {
    // Querying the financials view directly guarantees we only fetch
    // properties that actually have parsed T12 ledger data.
    const query = `
      SELECT DISTINCT property_name
      FROM \`asset-management-poc-493809.asset_mgmt_poc.vw_dashboard_financials\`
      WHERE property_name IS NOT NULL
      ORDER BY property_name ASC
    `;

    const [rows] = await bigquery.query({ query });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Properties API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
