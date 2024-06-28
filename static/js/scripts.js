document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded and parsed");
    loadParentCategories();
    applySearchAndFilter();
});

// Scrolling functionality
window.scrollLeft = function(wrapperId) {
    let wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        wrapper.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
        setTimeout(() => checkScroll(wrapperId), 300); // Check scroll position after animation
    }
};

window.scrollRight = function(wrapperId) {
    let wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        wrapper.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
        setTimeout(() => checkScroll(wrapperId), 300); // Check scroll position after animation
    }
};

function checkScroll(wrapperId) {
    let wrapper = document.getElementById(wrapperId);
    if (wrapper) {
        let scrollLeft = wrapper.scrollLeft;
        let scrollWidth = wrapper.scrollWidth;
        let clientWidth = wrapper.clientWidth;

        let scrollLeftButton = document.getElementById(wrapperId === 'parentCategoryButtonsWrapper' ? 'parentScrollLeft' : 'childScrollLeft');
        let scrollRightButton = document.getElementById(wrapperId === 'parentCategoryButtonsWrapper' ? 'parentScrollRight' : 'childScrollRight');

        if (scrollLeft <= 0) {
            scrollLeftButton.style.visibility = 'hidden';
        } else {
            scrollLeftButton.style.visibility = 'visible';
        }

        if (scrollLeft + clientWidth >= scrollWidth) {
            scrollRightButton.style.visibility = 'hidden';
        } else {
            scrollRightButton.style.visibility = 'visible';
        }
    }
}

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
        data.child_categories.forEach(function(child) {
            childCategoryButtons.append(`<button class="btn btn-secondary mx-1" onclick="loadChildCategory('${parentCategory}', '${child}')">${child}</button>`);
        });
        updateVideoSection(data.random_videos);
        $('#pdfSection').empty();
        checkScroll('childCategoryButtonsWrapper');
        $('#childScrollLeft').css('visibility', 'visible');
        $('#childScrollRight').css('visibility', 'visible');
    });
}

function loadChildCategory(parentCategory, childCategory) {
    $.get(`/videos/${parentCategory}/${childCategory}`, function(data) {
        updateVideoSection(data.videos);
        updatePdfSection(data.pdfs);
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

function updatePdfSection(pdfs) {
    let pdfSection = $('#pdfSection');
    pdfSection.empty();
    const categories = {
        "Catalog": [],
        "Instruction/Installation Manual": [],
        "Owners/User Manual": [],
        "Service Manual": [],
        "Technical Bulletin": [],
        "Warranty Information": [],
        "Specification Sheet": []
    };

    // Organize PDFs into categories
    for (const [category, pdfList] of Object.entries(pdfs)) {
        if (categories[category] !== undefined) {
            categories[category] = pdfList;
        }
    }

    // Create list for each category
    for (const [category, pdfList] of Object.entries(categories)) {
        if (pdfList.length > 0) {
            pdfSection.append(`
                <div class="pdf-category">
                    <h3>${category}</h3>
                    <ul>
                        ${pdfList.map(pdf => `<li><a href="${pdf[0]}" target="_blank">${pdf[1]}</a></li>`).join('')}
                    </ul>
                </div>
            `);
        }
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
