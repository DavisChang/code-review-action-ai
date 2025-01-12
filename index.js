const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");
const dotenv = require("dotenv");

dotenv.config();

async function run() {
  try {
    // Environment variables
    const githubToken = process.env.REPO_TOKEN;
    const apiProvider = process.env.API_PROVIDER || "gemini"; // Default to Gemini if not specified
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const googleApiKey = process.env.GEMINI_API_KEY;
    const [owner, repo] = process.env.REPO_REPOSITORY.split("/");
    const prNumber = process.env.REPO_PR_NUMBER;

    console.log("process.env:", {
      owner,
      repo,
      prNumber,
      apiProvider,
    });

    // Initialize Octokit
    const octokit = new Octokit({ auth: githubToken });

    // Get the list of changed files in the PR
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    for (const file of files) {
      if (!file.patch) continue; // Skip files with no changes

      const prompt = `Please perform a code review for the following changes. Highlight potential issues, suggest improvements, and identify any best practices violations:\n\n${file.patch}`;

      // Use the appropriate API based on API_PROVIDER
      const responseText =
        apiProvider === "openai"
          ? await callOpenAi(prompt, openaiApiKey)
          : await callGemini(prompt, googleApiKey);

      console.log("responseText: ", responseText, "\n\n");
      const comments = parseResponseToComments(responseText, file.filename);

      // Post comments to GitHub
      for (const comment of comments) {
        try {
          // Fetch the latest commit ID in the pull request
          const { data: pullRequest } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
          });

          const commitId = pullRequest.head.sha;

          // Get the diff details for the file
          const { data: files } = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
          });

          const fileDetails = files.find(
            (file) => file.filename === comment.path
          );

          if (!fileDetails) {
            throw new Error(
              `File not found in the pull request: ${comment.path}`
            );
          }

          // Parse the `patch` to find valid lines
          const diffLines = getValidLinesFromPatch(fileDetails.patch);
          if (!diffLines.includes(comment.position)) {
            throw new Error(
              `Invalid line number: ${comment.position}. Must be part of the diff.`
            );
          }

          await octokit.pulls.createReviewComment({
            owner,
            repo,
            pull_number: prNumber,
            body: comment.body,
            path: comment.path,
            line: comment.position, // Valid line number in the diff
            commit_id: commitId, // Latest commit SHA
          });

          console.log(`Comment added successfully: ${comment.body}`);
        } catch (error) {
          console.error(`Failed to add comment: ${comment.body}`);
          console.error("Error details:", error.message);
        }
      }
    }
  } catch (error) {
    console.error("Error running code review:", error.message);
    console.error(error);
    process.exit(1);
  }
}

// Function to call OpenAI API
async function callOpenAi(prompt, apiKey) {
  const response = await fetch("https://api.openai.com/v1/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003", // Use the desired OpenAI model
      prompt,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `OpenAI API error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices[0].text;
}

// Function to call Gemini API
async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Gemini API error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const generatedContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedContent) {
    throw new Error("No content returned by Gemini API.");
  }

  return generatedContent;
}

function parseResponseToComments(response, filename) {
  const comments = [];
  const lines = response.split("\n");

  lines.forEach((line) => {
    // Handle OpenAI style: "Line X: Comment text"
    const openAiMatch = line.match(/Line (\d+): (.+)/);
    if (openAiMatch) {
      comments.push({
        body: openAiMatch[2].trim(),
        path: filename,
        position: parseInt(openAiMatch[1], 10),
      });
      return;
    }

    // Handle Gemini style: "* Line X: Comment text"
    const geminiMatch = line.match(/\* Line (\d+): (.+)/);
    if (geminiMatch) {
      // Avoid duplicate comments by skipping "Suggested Improvements"
      if (!line.includes("Suggested Improvements:")) {
        comments.push({
          body: geminiMatch[2].trim(),
          path: filename,
          position: parseInt(geminiMatch[1], 10),
        });
      }
    }
  });

  return comments;
}

function getValidLinesFromPatch(patch) {
  // TODO:

  const validLines = [];
  const patchLines = patch.split("\n");

  let currentLine = 0;
  patchLines.forEach((line) => {
    if (line.startsWith("@@")) {
      // Parse the hunk header, e.g., "@@ -1,3 +1,3 @@"
      const matches = line.match(/\+(\d+)(,\d+)?/);
      if (matches) {
        currentLine = parseInt(matches[1], 10);
      }
    } else if (!line.startsWith("-") && !line.startsWith("\\")) {
      // Add valid line (lines not removed in the diff)
      validLines.push(currentLine);
      currentLine++;
    }
  });

  return validLines;
}

run();

module.exports = { parseResponseToComments };
