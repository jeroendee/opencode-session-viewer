/**
 * JavaScript for exported HTML documents.
 * Returns a complete script as a string that includes:
 * - toggleTheme() function that toggles .dark class and saves to localStorage
 * - Initialize theme from localStorage on DOMContentLoaded
 * - Click handlers for [data-toggle] elements to expand/collapse
 * - Click handlers for [data-scroll-to] elements for message navigation
 * - Mobile sidebar toggle
 */
export function getExportScripts(): string {
  return `
(function() {
  'use strict';

  // Theme management
  function getStoredTheme() {
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage not available
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateThemeIcon();
  }

  function updateThemeIcon() {
    var isDark = document.documentElement.classList.contains('dark');
    var sunIcon = document.querySelector('.theme-toggle .sun-icon');
    var moonIcon = document.querySelector('.theme-toggle .moon-icon');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = isDark ? 'block' : 'none';
      moonIcon.style.display = isDark ? 'none' : 'block';
    }
  }

  window.toggleTheme = function() {
    var isDark = document.documentElement.classList.contains('dark');
    var newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    setStoredTheme(newTheme);
  };

  // Expand/collapse functionality
  function setupToggleHandlers() {
    document.addEventListener('click', function(e) {
      var button = e.target.closest('[data-toggle]');
      if (!button) return;

      var targetId = button.getAttribute('data-toggle');
      var target = document.getElementById(targetId);
      if (!target) return;

      var isExpanded = button.getAttribute('aria-expanded') === 'true';
      var newState = !isExpanded;

      // Update button state
      button.setAttribute('aria-expanded', newState.toString());

      // Update chevron rotation
      var chevron = button.querySelector('.assistant-chevron, .tool-chevron, .reasoning-chevron, .embedded-chevron');
      if (chevron) {
        if (newState) {
          chevron.classList.add('expanded');
        } else {
          chevron.classList.remove('expanded');
        }
      }

      // Toggle content visibility
      if (newState) {
        target.classList.remove('hidden');
      } else {
        target.classList.add('hidden');
      }
    });
  }

  // Message navigation with smooth scroll and highlight
  function setupScrollHandlers() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('[data-scroll-to]');
      if (!link) return;

      e.preventDefault();
      var targetId = link.getAttribute('data-scroll-to');
      var target = document.getElementById(targetId);
      if (!target) return;

      // Smooth scroll to target
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Add highlight animation
      setTimeout(function() {
        target.classList.add('highlight-message');
        setTimeout(function() {
          target.classList.remove('highlight-message');
        }, 2000);
      }, 300);

      // Update active state in sidebar
      var allLinks = document.querySelectorAll('[data-scroll-to]');
      allLinks.forEach(function(l) {
        l.classList.remove('active');
      });
      link.classList.add('active');

      // Close mobile sidebar if open
      closeMobileSidebar();
    });
  }

  // Mobile sidebar toggle
  var sidebarOpen = false;

  function openMobileSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) {
      sidebar.classList.add('mobile-open');
      sidebarOpen = true;
    }
    if (overlay) {
      overlay.classList.add('open');
    }
  }

  function closeMobileSidebar() {
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
      sidebarOpen = false;
    }
    if (overlay) {
      overlay.classList.remove('open');
    }
  }

  window.toggleMobileSidebar = function() {
    if (sidebarOpen) {
      closeMobileSidebar();
    } else {
      openMobileSidebar();
    }
  };

  function setupMobileSidebar() {
    // Close sidebar when clicking overlay
    var overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', closeMobileSidebar);
    }

    // Close sidebar on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && sidebarOpen) {
        closeMobileSidebar();
      }
    });
  }

  // Initialize on DOM ready
  function init() {
    // Apply stored theme or use document default
    var storedTheme = getStoredTheme();
    if (storedTheme) {
      applyTheme(storedTheme);
    } else {
      // Use the theme class that was set in the HTML
      updateThemeIcon();
    }

    setupToggleHandlers();
    setupScrollHandlers();
    setupMobileSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`.trim();
}
