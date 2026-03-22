from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import os

app = FastAPI(title="GitHub Profile Finder", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

GITHUB_API = "https://api.github.com"
HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


@app.get("/api/github/{username}")
async def get_github_user(username: str):
    """Fetch a GitHub user's public profile data."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/users/{username}", headers=HEADERS, timeout=10
        )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub user '{username}' not found.")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="GitHub API error.")
    return resp.json()


@app.get("/api/github/{username}/repos")
async def get_github_repos(username: str):
    """Fetch a GitHub user's top 6 public repos sorted by star count."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{GITHUB_API}/users/{username}/repos",
            headers=HEADERS,
            params={"sort": "stars", "direction": "desc", "per_page": 6},
            timeout=10,
        )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"GitHub user '{username}' not found.")
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="GitHub API error.")
    repos = resp.json()
    return [
        {
            "name": r["name"],
            "description": r.get("description"),
            "html_url": r["html_url"],
            "stargazers_count": r["stargazers_count"],
            "forks_count": r["forks_count"],
            "language": r.get("language"),
            "updated_at": r["updated_at"],
        }
        for r in repos
    ]


# Serve frontend — must be after API routes
app.mount(
    "/",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static"), html=True),
    name="static",
)
