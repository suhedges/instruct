document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    loadParentCategories();
    applySearchAndFilter();
});

// Scrolling functionality
window.scrollLeft = function(wrapperId) {
    console.log("scrollLeft function called with ID:", wrapperId); // Debugging line
    let wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        console.log("Scrolling left:", wrapper); // Debugging line
        wrapper.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    } else {
        console.error("Element not found for scrollLeft with ID:", wrapperId);
    }
};

window.scrollRight = function(wrapperId) {
    console.log("scrollRight function called with ID:", wrapperId); // Debugging line
    let wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        console.log("Scrolling right:", wrapper); // Debugging line
        wrapper.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    } else {
        console.error("Element not found for scrollRight with ID:", wrapperId);
    }
};

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
    });
}

function loadParentCategory(parentCategory) {
    $.get(`/videos/${parentCategory}`, function(data) {
        let childCategoryButtons = $('#childCategoryButtons');
        childCategoryButtons.empty();
        console.log("Child categories data:", data); // Debugging line
        data.child_categories.forEach(function(child) {
            childCategoryButtons.append(`<button class="btn btn-secondary mx-1" onclick="loadChildCategory('${parentCategory}', '${child}')">${child}</button>`);
        });
        updateVideoSection(data.random_videos);
        $('#pdfSection').empty();
    });
}

function loadChildCategory(parentCategory, childCategory) {
    $.get(`/videos/${parentCategory}/${childCategory}`, function(data) {
        updateVideoSection(data.videos);
        updatePdfSection(data.pdfs);
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

function updatePdfSection(pdfs) {
    let pdfSection = $('#pdfSection');
    pdfSection.empty();
    for (const [category, pdfList] of Object.entries(pdfs)) {
        pdfSection.append(`<h2>${category}</h2>`);
        pdfList.forEach(function(pdf) {
            pdfSection.append(`<a href="${pdf[0]}" target="_blank">${pdf[1]}</a><br>`);
        });
    }
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

    parentCategoryButtons.forEach(button => {
        const parentCategory = button.textContent.toLowerCase();
        if (parentCategory.includes(filter) || parentCategoriesToShow.has(parentCategory)) {
            button.style.display = '';
        } else {
            button.style.display = 'none';
        }
    });
}
