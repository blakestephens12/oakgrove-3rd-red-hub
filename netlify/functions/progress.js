// Fetches live fundraiser totals from the Goals table in Airtable.
// The Airtable token stays server-side here — never sent to the browser.
//
// Requires one environment variable, set in the Netlify dashboard:
//   AIRTABLE_TOKEN — a Personal Access Token scoped to read-only access
//                    on this one base (create it at airtable.com/create/tokens)

const BASE_ID = "appOzMV89kXZFPrYC";
const TABLE_ID = "tblZ1MQhXOwCvb2Fw"; // Goals table

exports.handler = async function () {
  const token = process.env.AIRTABLE_TOKEN;

  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AIRTABLE_TOKEN is not set in Netlify environment variables." }),
    };
  }

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: "Airtable request failed" }) };
    }

    const data = await res.json();

    const goals = {};
    for (const record of data.records || []) {
      const name = record.fields["Goal Name"];
      const target = record.fields["Target Amount"] || 0;
      const raised = record.fields["Amount Raised"] || 0;
      if (name) {
        goals[name] = {
          raised,
          target,
          pct: target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0,
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // cache 5 min so the site doesn't hammer Airtable
      },
      body: JSON.stringify(goals),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
