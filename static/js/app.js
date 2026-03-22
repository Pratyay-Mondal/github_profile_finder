// ─── Language colour map ────────────────────────────────────────────────────
const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', 'C++': '#f34b7d',
    C: '#555555', 'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95',
    Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', HTML: '#e34c26',
    CSS: '#563d7c', Shell: '#89e051', Lua: '#000080', Haskell: '#5e5086',
    Scala: '#c22d40', R: '#198CE7', Elixir: '#6e4a7e', Vue: '#41b883',
};

// ─── DOM refs ────────────────────────────────────────────────────────────────
const form = document.getElementById('searchForm');
const input = document.getElementById('usernameInput');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMsg = document.getElementById('errorMsg');
const profileSection = document.getElementById('profileSection');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

function setText(id, value) {
    document.getElementById(id).textContent = value ?? '';
}

function setHref(id, href) {
    document.getElementById(id).href = href;
}

function formatNumber(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
    return String(n);
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function showError(msg) {
    hide(loadingState);
    hide(profileSection);
    errorMsg.textContent = msg;
    show(errorState);
}

// ─── Render profile ───────────────────────────────────────────────────────────
function renderProfile(user) {
    // Avatar
    const avatar = document.getElementById('avatar');
    avatar.src = user.avatar_url;
    avatar.alt = `${user.login}'s GitHub avatar`;

    // Name / login
    setText('profileName', user.name || user.login);
    const loginEl = document.getElementById('profileLogin');
    loginEl.textContent = '@' + user.login;
    loginEl.href = user.html_url;

    // Bio
    setText('profileBio', user.bio || '');

    // Meta — location
    const locItem = document.getElementById('profileLocation');
    if (user.location) {
        setText('locationText', user.location);
        show(locItem);
    } else { hide(locItem); }

    // Meta — company
    const compItem = document.getElementById('profileCompany');
    if (user.company) {
        setText('companyText', user.company.replace(/^@/, ''));
        show(compItem);
    } else { hide(compItem); }

    // Meta — blog
    const blogItem = document.getElementById('profileBlog');
    if (user.blog) {
        const blogLink = document.getElementById('blogLink');
        blogLink.href = user.blog.startsWith('http') ? user.blog : 'https://' + user.blog;
        blogLink.textContent = user.blog.replace(/^https?:\/\//, '');
        show(blogItem);
    } else { hide(blogItem); }

    // Meta — joined
    setText('joinedText', 'Joined ' + formatDate(user.created_at));

    // Stats
    setText('statRepos', formatNumber(user.public_repos));
    setText('statFollowers', formatNumber(user.followers));
    setText('statFollowing', formatNumber(user.following));
    setText('statGists', formatNumber(user.public_gists));

    // GitHub link
    setHref('profileGithubLink', user.html_url);

    show(profileSection);
}

// ─── Render repos ─────────────────────────────────────────────────────────────
function renderRepos(repos) {
    const grid = document.getElementById('reposGrid');
    grid.innerHTML = '';

    if (!repos.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No public repositories found.</p>';
        return;
    }

    repos.forEach(repo => {
        const card = document.createElement('a');
        card.className = 'repo-card';
        card.href = repo.html_url;
        card.target = '_blank';
        card.rel = 'noopener';
        card.setAttribute('aria-label', `Repository: ${repo.name}`);

        const langColor = repo.language ? (LANG_COLORS[repo.language] || '#8b94a3') : null;
        const langHTML = repo.language
            ? `<span class="lang-dot" style="background:${langColor}" aria-hidden="true"></span>
         <span class="lang-label">${repo.language}</span>`
            : '';

        card.innerHTML = `
      <div class="repo-card-name">${escapeHTML(repo.name)}</div>
      <div class="repo-card-desc">${repo.description ? escapeHTML(repo.description) : '<em style="color:var(--text-muted)">No description</em>'}</div>
      <div class="repo-card-footer">
        ${langHTML}
        <span class="repo-stat" aria-label="${repo.stargazers_count} stars">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${formatNumber(repo.stargazers_count)}
        </span>
        <span class="repo-stat" aria-label="${repo.forks_count} forks">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
          ${formatNumber(repo.forks_count)}
        </span>
      </div>
    `;
        grid.appendChild(card);
    });
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Fetch & orchestrate ──────────────────────────────────────────────────────
async function searchUser(username) {
    hide(errorState);
    hide(profileSection);
    show(loadingState);

    try {
        const [userResp, reposResp] = await Promise.all([
            fetch(`/api/github/${encodeURIComponent(username)}`),
            fetch(`/api/github/${encodeURIComponent(username)}/repos`),
        ]);

        if (userResp.status === 404) {
            const data = await userResp.json().catch(() => ({}));
            showError(data.detail || `User "${username}" not found on GitHub.`);
            return;
        }
        if (!userResp.ok) { showError('GitHub API error. Please try again shortly.'); return; }

        const [user, repos] = await Promise.all([userResp.json(), reposResp.json()]);
        hide(loadingState);
        renderProfile(user);
        renderRepos(Array.isArray(repos) ? repos : []);

        // Scroll to profile
        profileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        showError('Network error — make sure the server is running.');
        console.error(err);
    }
}

// ─── Event listeners ──────────────────────────────────────────────────────────
form.addEventListener('submit', e => {
    e.preventDefault();
    const username = input.value.trim();
    if (!username) { input.focus(); return; }
    searchUser(username);
});

// Allow pressing Enter in the input (already handled by form submit)
// Focus input on load
input.focus();
