import { BigQuery } from "@google-cloud/bigquery";

export const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GCP_PROJECT || "uat-test-dev";
export const DATASET_ID = process.env.BIGQUERY_DATASET_ID || "asset_mgmt";

export const bigquery = new BigQuery({ projectId: PROJECT_ID });

/**
 * Execute a query on BigQuery with automatic dataset fallback logic.
 * If the query fails due to table/dataset not found in primary DATASET_ID,
 * it tries alternative dataset names ('asset_mgmt', 'asset_mgmt_poc').
 */
export async function runQuery(queryStr, queryOptions = {}) {
  const replaceDataset = (q, ds) => q.replace(/__DATASET__/g, ds).replace(/__PROJECT__/g, PROJECT_ID);

  try {
    const formattedQuery = replaceDataset(queryStr, DATASET_ID);
    const [rows] = await bigquery.query({ query: formattedQuery, ...queryOptions });
    return rows;
  } catch (primaryErr) {
    console.warn(`BigQuery primary query failed on dataset ${DATASET_ID}:`, primaryErr.message);

    const fallbacks = [
      DATASET_ID === "asset_mgmt" ? "asset_mgmt_poc" : "asset_mgmt",
      "asset_mgmt_poc",
      "asset_mgmt"
    ].filter(ds => ds !== DATASET_ID);

    for (const fallbackDataset of fallbacks) {
      try {
        console.info(`Attempting fallback dataset: ${fallbackDataset}`);
        const fallbackQuery = replaceDataset(queryStr, fallbackDataset);
        const [rows] = await bigquery.query({ query: fallbackQuery, ...queryOptions });
        return rows;
      } catch (fallbackErr) {
        console.warn(`Fallback dataset ${fallbackDataset} failed:`, fallbackErr.message);
      }
    }

    throw primaryErr;
  }
}
