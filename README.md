# **Code Review GitHub Action**

The **Code Review GitHub Action** automates the process of reviewing pull requests (PRs) by leveraging AI models like OpenAI’s GPT and Gemini. This action analyzes code changes, provides suggestions, and adds inline comments on GitHub, helping improve code quality, enforce best practices, and boost productivity.

---

## **Features**
- **Automated Reviews**: Automatically triggered on PR creation or updates.
- **AI-Powered Analysis**: Supports OpenAI GPT-4 and Gemini for reviewing code changes.
- **Inline GitHub Comments**: Adds comments directly to the relevant lines of code in the PR.
- **Broad Language Support**: Works with any programming language or framework.
- **Customizable**: Choose your preferred AI provider and fine-tune behavior.

---

## **Setup Instructions**

### **1. Add to Your Workflow**
To integrate this action, create or update the file `.github/workflows/code-review.yml` in your repository with the following content:

```yaml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run AI Code Review
        uses: your-username/code-review-action@v1
        with:
          api_provider: "openai" # Choose between "openai" or "gemini"
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          github_token: ${{ secrets.GITHUB_TOKEN }}

```
### **2. Configure Secrets**
To ensure the action works properly, you need to add secrets for authentication. Navigate to your repository’s **Settings > Secrets and variables > Actions** and add the following secrets:

- **`OPENAI_API_KEY`**: Your OpenAI API key, required if you choose OpenAI as the provider.
- **`GEMINI_API_KEY`**: Your Gemini API key, required if you choose Gemini as the provider.
- **`GITHUB_TOKEN`**: GitHub token, automatically available as `${{ secrets.GITHUB_TOKEN }}`. This is required for the action to interact with your repository.

### **Example Secrets**
| Secret Name       | Description                                         |
|-------------------|-----------------------------------------------------|
| `OPENAI_API_KEY`  | The API key to access OpenAI’s GPT models.          |
| `GEMINI_API_KEY`  | The API key to access Gemini's code review service. |
| `GITHUB_TOKEN`    | GitHub token for posting comments and retrieving PR data. |

### **How to Add Secrets**
1. Go to your repository on GitHub.
2. Click on the **Settings** tab.
3. Navigate to **Secrets and variables > Actions**.
4. Click the **New repository secret** button.
5. Add the secret name and value (e.g., `OPENAI_API_KEY` and its corresponding API key).
6. Repeat the process for `GEMINI_API_KEY` and `GITHUB_TOKEN`.

Once the secrets are added, they will be securely stored and accessible in your GitHub Actions workflows.
