document.addEventListener("DOMContentLoaded", () => {
    let form = document.getElementById("change-slideshow-content");
    let input = document.getElementById("posts-website");
    let updateButton = document.getElementById("update-slideshow-content");
    let hide = document.getElementById("hide-form");

    hide.addEventListener("click", () => {
        form.classList.toggle("hidden");
        hide.classList.toggle("show");
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault()
        slideshows[0].updatePosts(input.value);
    })

    updateButton.addEventListener("click", (e) => {
        e.preventDefault()
        slideshows[0].updatePosts(input.value);
    })

});