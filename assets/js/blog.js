(function () {
  const GITHUB_USER = 'allamiro';
  const API_URL = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=100`;
  const postsContainer = document.querySelector('[data-posts]');
  const statusBanner = document.querySelector('[data-status]');
  const statusText = statusBanner ? statusBanner.querySelector('.status-text') : null;
  const countEl = document.querySelector('[data-count]');
  const yearEl = document.querySelector('[data-year]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && event.target !== navToggle) {
        if (nav.classList.contains('is-open')) {
          nav.classList.remove('is-open');
          navToggle.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  if (!postsContainer) {
    return;
  }

  const cutoffDate = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 2);
    return date;
  })();

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown timeline';
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(isoString));
  };

  const formatRelative = (isoString) => {
    if (!isoString) return '';
    const pushedAt = new Date(isoString);
    const diffMs = Date.now() - pushedAt.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays <= 14) return 'Shipped this month';
    if (diffDays <= 60) return 'Actively shipping';
    if (diffDays <= 180) return 'In rotation';
    if (diffDays <= 365) return 'Maintenance mode';
    return 'Long-term support';
  };

  const sanitize = (value) => {
    if (!value) return '';
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  };

  const buildTags = (repo, recencyLabel) => {
    const tags = [];
    if (repo.language) {
      tags.push(repo.language);
    }
    if (Array.isArray(repo.topics)) {
      repo.topics.slice(0, 3).forEach((topic) => {
        if (topic && topic.trim()) {
          tags.push(topic);
        }
      });
    }
    if (recencyLabel) {
      tags.push(recencyLabel);
    }
    if (!tags.length) {
      tags.push('Active project');
    }
    const unique = [];
    tags.forEach((tag) => {
      const label = tag.toUpperCase();
      if (!unique.includes(label)) {
        unique.push(label);
      }
    });
    return unique.slice(0, 4);
  };

  const renderPosts = (repos) => {
    postsContainer.innerHTML = '';

    if (!repos.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = [
        '<h3>No active contributions yet</h3>',
        '<p>When I ship updates to my repositories you\'ll see the full write-up right here. In the meantime feel free to explore the rest of the site or browse my work on GitHub.</p>',
        `<p><a class="post-link" href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener">Visit my GitHub profile →</a></p>`
      ].join('');
      postsContainer.appendChild(empty);
      postsContainer.setAttribute('aria-busy', 'false');
      if (countEl) {
        countEl.textContent = '0 active projects right now';
      }
      if (statusBanner && statusText) {
        statusBanner.classList.remove('is-error');
        statusBanner.classList.add('is-ready');
        statusText.textContent = 'No active projects to share at the moment.';
      }
      return;
    }

    const fragment = document.createDocumentFragment();

    repos.forEach((repo) => {
      const article = document.createElement('article');
      article.className = 'post-card';

      const recencyLabel = formatRelative(repo.pushed_at);
      const tags = buildTags(repo, recencyLabel);

      const meta = document.createElement('div');
      meta.className = 'post-meta';
      const metaParts = [`<span>Updated ${sanitize(formatDate(repo.pushed_at))}</span>`];
      if (repo.language) {
        metaParts.push(`<span>${sanitize(repo.language)}</span>`);
      }
      if (repo.visibility === 'public' && repo.license && repo.license.spdx_id) {
        metaParts.push(`<span>${sanitize(repo.license.spdx_id)}</span>`);
      }
      meta.innerHTML = metaParts.join('');

      const heading = document.createElement('h3');
      heading.innerHTML = `<a href="${repo.html_url}" target="_blank" rel="noopener">${sanitize(repo.name)}</a>`;

      const description = document.createElement('p');
      description.innerHTML = sanitize(repo.description || 'Documentation is in progress. Check the repository for commit history and roadmap.');

      const tagList = document.createElement('ul');
      tagList.className = 'post-tags';
      tags.forEach((tag) => {
        const li = document.createElement('li');
        li.textContent = tag;
        tagList.appendChild(li);
      });

      const footer = document.createElement('div');
      footer.className = 'post-footer';
      const link = document.createElement('a');
      link.className = 'post-link';
      link.href = repo.html_url;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'View on GitHub';

      const stats = document.createElement('div');
      stats.className = 'post-stats';
      stats.innerHTML = `<span>★ ${repo.stargazers_count}</span><span>⑂ ${repo.forks_count}</span>`;

      footer.append(link, stats);
      article.append(meta, heading, description, tagList, footer);
      fragment.appendChild(article);
    });

    postsContainer.appendChild(fragment);
    postsContainer.setAttribute('aria-busy', 'false');

    if (countEl) {
      const count = repos.length;
      countEl.textContent = `${count} active project${count === 1 ? '' : 's'}`;
    }

    if (statusBanner && statusText) {
      statusBanner.classList.remove('is-error');
      statusBanner.classList.add('is-ready');
      statusText.textContent = 'Showing actively maintained repositories.';
    }
  };

  const selectActiveRepos = (repos) => {
    const curated = repos.filter((repo) => {
      if (!repo) return false;
      if (repo.archived || repo.disabled) return false;
      if (repo.fork) return false;
      if (!repo.pushed_at) return false;
      const pushedAt = new Date(repo.pushed_at);
      return pushedAt >= cutoffDate;
    });

    if (curated.length) {
      return curated;
    }

    // Fallback: return top non-fork repositories if nothing is recent.
    return repos
      .filter((repo) => repo && !repo.fork && !repo.archived)
      .slice(0, 6);
  };

  const fetchRepos = async () => {
    try {
      const response = await fetch(API_URL, {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response');
      }

      const activeRepos = selectActiveRepos(data).sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
      renderPosts(activeRepos);
    } catch (error) {
      console.error('Unable to load GitHub repositories', error);
      postsContainer.innerHTML = '';
      const fallback = document.createElement('div');
      fallback.className = 'empty-state';
      fallback.innerHTML = [
        '<h3>GitHub data is unavailable right now</h3>',
        `<p>We tried to fetch repositories for <strong>${GITHUB_USER}</strong> but the request failed. You can still view the work directly on GitHub while this page refreshes later.</p>`,
        `<p><a class="post-link" href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener">Open GitHub profile →</a></p>`
      ].join('');
      postsContainer.appendChild(fallback);
      postsContainer.setAttribute('aria-busy', 'false');
      if (countEl) {
        countEl.textContent = 'Projects unavailable';
      }
      if (statusBanner && statusText) {
        statusBanner.classList.remove('is-ready');
        statusBanner.classList.add('is-error');
        statusText.textContent = 'We could not reach the GitHub API. Please try again later.';
      }
    }
  };

  fetchRepos();
})();
