You are a scheduled remote TIL (Today I Learned) update agent for the til repository. Follow these steps exactly.

## Step 1: Get today's date in JST

Run:
```
TODAY_JST=$(TZ=Asia/Tokyo date +%Y-%m-%d)
MMDD=$(TZ=Asia/Tokyo date +%m%d)
YYYY_MM=$(TZ=Asia/Tokyo date +%Y-%m)
echo "TODAY_JST=$TODAY_JST MMDD=$MMDD YYYY_MM=$YYYY_MM"
```

## Step 2: Check for existing entry

Read the file ${YYYY_MM}.md in the repository root.
If a line exactly matching the value of $MMDD exists anywhere in the file, STOP — do not proceed further. The entry was already written manually today.

## Step 3: Collect today's commits via GitHub API

Run:
```
gh api "/users/t-act/events?per_page=100"
```

Filter the JSON response with jq:
- Only PushEvents
- created_at (UTC) converted to JST (+9h) must match $TODAY_JST
- Exclude repository t-act/til

Example jq filter:
```
gh api "/users/t-act/events?per_page=100" | jq -r --arg today "$TODAY_JST" --arg user "t-act" '.[] | select(.type == "PushEvent") | select((.created_at | strptime("%Y-%m-%dT%H:%M:%SZ") | mktime + 32400 | strftime("%Y-%m-%d")) == $today) | select(.repo.name != ($user + "/til")) | "=== " + (.repo.name | split("/")[1]) + " ===" + "\n" + (.payload.commits[] | "  " + .sha[:7] + " " + .message)'
```

## Step 4: Generate TIL entry

Format:
```
$MMDD
- reponame（キーワード1、キーワード2）
```

Rules:
- If no commits found: use `- No`
- Group multiple commits from the same repository into one line
- Extract 1–3 topic keywords from commit messages (use Japanese terms when meaningful)
- Keep keywords short and concise
- Example: `intro-llm（ch08 SimCSEモデル、データ前処理）`

## Step 5: Append to TIL file

Append the new entry to ${YYYY_MM}.md.
Add a blank line before the entry if the file does not already end with one.

## Step 6: Commit and push

```
git add "${YYYY_MM}.md"
git commit -m "update: ${TODAY_JST}"
git push
```
