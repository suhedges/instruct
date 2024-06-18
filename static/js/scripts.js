document.addEventListener('DOMContentLoaded', function() {
  var accordions = document.querySelectorAll('.accordion details'); // Update the selector
  var searchInput = document.getElementById('searchInput');
  var filterInstructions = document.getElementById('filterInstructions');
  var filterVideos = document.getElementById('filterVideos');

  accordions.forEach(function(accordion) {
    accordion.addEventListener('toggle', function() {
      accordions.forEach(function(otherAccordion) {
        if (otherAccordion !== accordion) {
          otherAccordion.removeAttribute('open');
          otherAccordion.querySelector('summary').classList.remove('active');
        }
      });
      accordion.querySelector('summary').classList.toggle('active');
    });
  });

  // Attach event listeners to search input and filter checkboxes
  searchInput.addEventListener('input', applySearchAndFilter);
  filterInstructions.addEventListener('change', applySearchAndFilter);
  filterVideos.addEventListener('change', applySearchAndFilter);
});

// Define a global dictionary to store the original visibility state of each category
var categoryVisibilityState = {};

function applySearchAndFilter() {
    var input = document.getElementById('searchInput').value.toUpperCase();
    var instructionsChecked = document.getElementById('filterInstructions').checked;
    var videosChecked = document.getElementById('filterVideos').checked;
    var cards = document.querySelectorAll('.card');

    cards.forEach(function(card) {
        var cardBody = card.querySelector('.card-body');
        var categories = cardBody.querySelectorAll('.category-link');

        categories.forEach(function(category) {
            var categoryName = category.textContent || category.innerText;
            var highlights = category.getAttribute('data-highlights');
            var isVisible = true;

            if (categoryVisibilityState.hasOwnProperty(categoryName)) {
                isVisible = categoryVisibilityState[categoryName];
            }

            var showCategory = categoryName.toUpperCase().includes(input) &&
                (instructionsChecked ? ['bright-orange', 'light-green'].includes(highlights) : true) &&
                (videosChecked ? ['purple', 'light-green'].includes(highlights) : true);

            if (showCategory) {
                category.style.display = "block"; 
                category.classList.remove('hidden');
            } else {
                category.style.display = "none"; 
                category.classList.add('hidden');
            }

            categoryVisibilityState[categoryName] = showCategory;
        });

        var visibleCategories = cardBody.querySelectorAll('.category-link:not(.hidden)');
        cardBody.innerHTML = ''; 

        visibleCategories.forEach(function(visibleCategory) {
            cardBody.appendChild(visibleCategory); 
        });

        card.style.display = visibleCategories.length > 0 ? "block" : "none";
    });

    // Restore hidden categories based on the original visibility state
    var allCategories = document.querySelectorAll('.category-link');
    allCategories.forEach(function(category) {
        var categoryName = category.textContent || category.innerText;
        var cardBody = category.closest('.card-body');
        
        if (!categoryVisibilityState[categoryName] && !cardBody.contains(category)) {
            cardBody.appendChild(category);
        }
    });
}

// Listen for changes in search input and filter options
document.getElementById('searchInput').addEventListener('input', function() {
    applySearchAndFilter();
    refreshPage();
});
document.getElementById('filterInstructions').addEventListener('change', function() {
    applySearchAndFilter();
    refreshPage();
});
document.getElementById('filterVideos').addEventListener('change', function() {
    applySearchAndFilter();
    refreshPage();
});

function refreshPage() {
    // Preserve the current search input value
    var searchInputValue = document.getElementById('searchInput').value;

    // Refresh the page while maintaining the search input value and filter states
    location.href = location.pathname + '?search=' + searchInputValue + '&instructions=' + document.getElementById('filterInstructions').checked + '&videos=' + document.getElementById('filterVideos').checked;
}

// On page load, apply the search and filter based on the URL parameters
window.onload = function() {
    var searchParams = new URLSearchParams(window.location.search);
    var searchInput = searchParams.get('search');
    var filterInstructions = searchParams.get('instructions') === 'true';
    var filterVideos = searchParams.get('videos') === 'true';

    if (searchInput) {
        document.getElementById('searchInput').value = searchInput;
    }

    document.getElementById('filterInstructions').checked = filterInstructions;
    document.getElementById('filterVideos').checked = filterVideos;

    applySearchAndFilter();
};