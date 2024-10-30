window.startScroll = function(wrapperId, direction) {
    let wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        // Ensure any existing interval is cleared
        if (wrapper.scrollInterval) {
            clearInterval(wrapper.scrollInterval);
        }
        wrapper.scrollInterval = setInterval(function() {
            wrapper.scrollBy({
                left: direction === 'left' ? -4 : 4,
                behavior: 'auto' 
            });
        }, 10);
    }
};

window.stopScroll = function(wrapperId) {
    let wrapper = document.getElementById(wrapperId);
    if (wrapper && wrapper.scrollInterval) {
        clearInterval(wrapper.scrollInterval);
        wrapper.scrollInterval = null;
    }
};


document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    loadParentCategories();
    applySearchAndFilter();
});

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    loadParentCategories();
    applySearchAndFilter();

    // For parent category scroll buttons
    let parentScrollLeftButton = document.getElementById('parentScrollLeft');
    let parentScrollRightButton = document.getElementById('parentScrollRight');

    parentScrollLeftButton.addEventListener('mouseenter', function() {
        startScroll('parentCategoryButtonsWrapper', 'left');
    });
    parentScrollLeftButton.addEventListener('mouseleave', function() {
        stopScroll('parentCategoryButtonsWrapper');
    });

    parentScrollRightButton.addEventListener('mouseenter', function() {
        startScroll('parentCategoryButtonsWrapper', 'right');
    });
    parentScrollRightButton.addEventListener('mouseleave', function() {
        stopScroll('parentCategoryButtonsWrapper');
    });

    // For child category scroll buttons
    let childScrollLeftButton = document.getElementById('childScrollLeft');
    let childScrollRightButton = document.getElementById('childScrollRight');

    childScrollLeftButton.addEventListener('mouseenter', function() {
        startScroll('childCategoryButtonsWrapper', 'left');
    });
    childScrollLeftButton.addEventListener('mouseleave', function() {
        stopScroll('childCategoryButtonsWrapper');
    });

    childScrollRightButton.addEventListener('mouseenter', function() {
        startScroll('childCategoryButtonsWrapper', 'right');
    });
    childScrollRightButton.addEventListener('mouseleave', function() {
        stopScroll('childCategoryButtonsWrapper');
    });
});

// AJAX functions
function loadParentCategories() {
    $.get('/parent-categories', function(data) {
        let parentCategoryButtons = $('#parentCategoryButtons');
        parentCategoryButtons.empty();
        console.log("Parent categories data:", data); // Debugging line
        data.parent_categories.forEach(function(parent) {
            parentCategoryButtons.append(`<button class="btn btn-primary mx-1" onclick="loadParentCategory('${parent}')">${parent}</button>`);
        });
        applySearchAndFilter();
        checkScroll('parentCategoryButtonsWrapper');
    });
}

function loadParentCategory(parentCategory) {
    $.get(`/videos/${parentCategory}`, function(data) {
        let childCategoryButtons = $('#childCategoryButtons');
        childCategoryButtons.empty();
        console.log("Child categories data:", data); // Debugging line
        if (data.child_categories.length > 0) {
            data.child_categories.forEach(function(child) {
                childCategoryButtons.append(`<button class="btn btn-secondary mx-1" onclick="loadChildCategory('${parentCategory}', '${child}')">${child}</button>`);
            });
            updateVideoSection(data.random_videos);
            checkScroll('childCategoryButtonsWrapper');
            $('#childScrollLeft').css('visibility', 'visible');
            $('#childScrollRight').css('visibility', 'visible');
        } else {
            // Hide the child category buttons if there are no valid child categories
            $('#childScrollLeft').css('visibility', 'hidden');
            $('#childScrollRight').css('visibility', 'hidden');
        }
    });
}

function loadChildCategory(parentCategory, childCategory) {
    $.get(`/videos/${parentCategory}/${childCategory}`, function(data) {
        updateVideoSection(data.videos);
        checkScroll('childCategoryButtonsWrapper');
    });
}

function updateVideoSection(videos) {
    let videoSection = $('#videoSection');
    videoSection.empty();
    if (!videos || !Array.isArray(videos)) {
        console.error("Invalid videos data:", videos);
        return;
    }
    videos.forEach(function(video) {
        videoSection.append(`
            <div class="col-md-4 mb-4">
                <div class="embed-responsive embed-responsive-16by9 rounded">
                    <iframe class="embed-responsive-item" src="${video[0]}" allowfullscreen></iframe>
                </div>
                <div class="video-title">${video[1]}</div>
            </div>
        `);
    });
}

// Existing search and filter functions
function applySearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const filter = searchInput.value.toLowerCase();
        filterCategories(filter);
    });
}

function filterCategories(filter) {
    const parentCategoryButtons = document.querySelectorAll('#parentCategoryButtons .btn');
    const childCategoryButtons = document.querySelectorAll('#childCategoryButtons .btn');
    let parentCategoriesToShow = new Set();

    // Filter child categories and collect parent categories that need to be shown
    childCategoryButtons.forEach(button => {
        const childCategory = button.textContent.toLowerCase();
        const parentCategory = button.getAttribute('onclick').match(/loadChildCategory\('([^']+)'/)[1];
        if (childCategory.includes(filter)) {
            button.style.display = '';
            parentCategoriesToShow.add(parentCategory);
        } else {
            button.style.display = 'none';
        }
    });

    // Show or hide parent categories based on filter
    parentCategoryButtons.forEach(button => {
        const parentCategory = button.textContent.toLowerCase();
        if (parentCategory.includes(filter) || parentCategoriesToShow.has(parentCategory)) {
            button.style.display = '';
        } else {
            button.style.display = 'none';
        }
    });

    // Ensure parent categories of displayed child categories are shown
    parentCategoriesToShow.forEach(parentCategory => {
        const parentButton = document.querySelector(`#parentCategoryButtons .btn[onclick="loadParentCategory('${parentCategory}')"]`);
        if (parentButton) {
            parentButton.style.display = '';
        }
    });
}
