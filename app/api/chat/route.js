import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { message } = await request.json();

    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
    const client = await auth.getClient();

    const projectId = process.env.GCP_PROJECT_ID;
    // Force lowercase to ensure case-sensitive cloud routing alignment
    const agentId = (process.env.BIGQUERY_DATA_AGENT_ID || "").toLowerCase();
    const location = process.env.GCP_LOCATION || "us";

    // Standard stateless regional endpoint mapping
    const url = `https://geminidataanalytics.googleapis.com/v1beta/projects/${projectId}/locations/${location}:chat`;

    const payload = {
      messages: [
        {
          userMessage: {
            text: message,
          },
        },
      ],
      dataAgentContext: {
        dataAgent: `projects/${projectId}/locations/${location}/dataAgents/${agentId}`,
        contextVersion: "PUBLISHED",
      },
    };

    const response = await client.request({
      url,
      method: "POST",
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-User-Project": projectId,
      },
    });

    let answerText = "";
    const responseData = response.data;

    if (Array.isArray(responseData)) {
      // Filter out internal thought logs and map only legitimate system answers
      const cleanParts = responseData
        .filter((item) => {
          const textObj = item?.systemMessage?.text;
          if (textObj && typeof textObj === "object") {
            return textObj.textType !== "THOUGHT";
          }
          return true;
        })
        .map((item) => {
          const textObj = item?.systemMessage?.text;
          if (textObj && typeof textObj === "object") {
            return textObj.parts || textObj.text || "";
          }
          return textObj || "";
        })
        .filter(Boolean)
        .flat();

      answerText =
        cleanParts.length > 0
          ? cleanParts.join("\n\n")
          : "Query executed successfully.";
    } else {
      const textObj = responseData?.systemMessage?.text;
      if (
        textObj &&
        typeof textObj === "object" &&
        textObj.textType !== "THOUGHT"
      ) {
        answerText = Array.isArray(textObj.parts)
          ? textObj.parts.join("\n\n")
          : textObj.text || "";
      } else if (typeof textObj === "string") {
        answerText = textObj;
      } else {
        answerText =
          "Clear answer could not be extracted from the response stream.";
      }
    }

    return NextResponse.json({ answer: answerText });
  } catch (error) {
    console.error("Chat API Proxy Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
