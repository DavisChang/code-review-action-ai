const { Octokit } = require("@octokit/rest");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

async function run() {
  try {
    // Environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY; // Add Gemini API Key
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    const prNumber = process.env.GITHUB_PR_NUMBER;
    const apiProvider = process.env.API_PROVIDER || "openai"; // Choose API provider: openai or gemini

    console.log("process.env:", { apiProvider, prNumber, owner, repo });

    // Initialize Octokit
    const octokit = new Octokit({ auth: githubToken });

    // Get the list of changed files in the PR
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    for (const file of files) {
      if (!file.patch) continue; // Skip if no changes

      const prompt = `Please perform a code review for the following changes. Highlight potential issues, suggest improvements, and identify any best practices violations:\n\n${file.patch}`;
      let responseText;

      // Use selected API provider
      if (apiProvider === "openai") {
        responseText = await callOpenAi(prompt, openaiApiKey);
      } else if (apiProvider === "gemini") {
        responseText = await callGemini(prompt, geminiApiKey);
      } else {
        throw new Error(
          "Invalid API provider specified. Use 'openai' or 'gemini'."
        );
      }

      const comments = parseResponseToComments(responseText, file.filename);

      // Post comments to GitHub
      for (const comment of comments) {
        await octokit.pulls.createReviewComment({
          owner,
          repo,
          pull_number: prNumber,
          body: comment.body,
          path: comment.path,
          position: comment.position,
        });
      }
    }
  } catch (error) {
    console.error("Error running code review:", error);
    process.exit(1);
  }
}

// Function to call OpenAI API
async function callOpenAi(prompt, apiKey) {
  const openai = new OpenAIApi(new Configuration({ apiKey }));
  const response = await openai.createCompletion({
    model: "gpt-4",
    prompt,
    max_tokens: 1000,
  });
  return response.data.choices[0].text;
}

// Function to call Gemini API
async function callGemini(prompt, apiKey) {
  const response = await fetch("https://gemini.api/endpoint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, maxTokens: 1000 }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Gemini API error: ${data.error || response.statusText}`);
  }
  return data.result;
}

// Parse API responses into GitHub-compatible comment format
function parseResponseToComments(response, filename) {
  const lines = response.split("\n");
  const comments = [];
  for (const line of lines) {
    // Assuming the API returns the format: `Line X: Comment here.`
    const match = line.match(/Line (\d+): (.+)/);
    if (match) {
      comments.push({
        body: match[2].trim(),
        path: filename,
        position: parseInt(match[1]),
      });
    }
  }
  return comments;
}

run();
