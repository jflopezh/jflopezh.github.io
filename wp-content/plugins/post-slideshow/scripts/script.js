class PostSlidewhow {
    
    /**
     * Collects the slideshow settings stored as data attributes to
     * initialize functionalities
     * @param {HTML Node} slideshow Slideshow HTML Node
     */
    constructor(slideshow) {
        // Load slideshow settings
        this.postsWebsite = slideshow.dataset.postsWebsite;
        this.transition = slideshow.dataset.transition;
        this.headingLevel = slideshow.dataset.headingLevel;
        this.infiniteLoop = (slideshow.dataset.infiniteLoop == "true");
        this.autoplay = (slideshow.dataset.autoplay == "true");

        if (this.autoplay) {
            this.autoplayInterval = slideshow.dataset.interval;
        }
        
        // DOM
        this.slideshow = slideshow;
        this.slidesWrapper = slideshow.children[0];
        this.previousButton = slideshow.children[1].children[0];
        this.nextButton = slideshow.children[1].children[1];
        this.pagination = slideshow.children[2];
        
        // Local variables
        this.size = this.slidesWrapper.clientWidth;
        this.currentSlide = 0;
        this.newLoad = false;

        this.loadPosts();
    }

    /**
     * Check if the posts passed website are cached, if not, fetches data from
     * the website API Rest and set a new item in the LocalStorage for better
     * performance in the next same url usage.
     */
    loadPosts() {
        if (!/^https?:\/\//i.test(this.postsWebsite)) {
            this.postsWebsite = 'https://' + this.postsWebsite;
        }
        localStorage.clear();
        // Check if the posts from given URL are cached in the LocalStorage
        let posts = JSON.parse(localStorage.getItem(this.postsWebsite));

        if (posts === null) { 
            fetch(this.postsWebsite+"/wp-json/wp/v2/posts?_fields=title,date,excerpt,link,_links.wp:featuredmedia,_embedded.wp:featuredmedia&_embed")
                .then( data => data.json() )
                .then( data => {
                    localStorage.setItem(this.postsWebsite, JSON.stringify(data));
                    this.renderPosts(data);
                } );
        } else {
            this.renderPosts(posts);
        }
    }

    /**
     * Creates an slide and a pagination bullet for each posts, adds
     * them to the document and fires the slideshow initialization
     * @param {JSON Object} posts Posts obtained from loadPosts function
     */
    renderPosts(posts) {
        posts.forEach((post, index) => {
            let slide = 
                `<div class="post-slide">
                    <div class="slide-image">
                        <a href="${post.link}"><img src="${(post._embedded) ? post._embedded["wp:featuredmedia"][0].source_url : "/wp-content/plugins/post-slideshow/images/placeholder.png"}"></a>
                    </div>
                    <div class="slide-content">
                        <a href="${post.link}"><${this.headingLevel} class="title">${post.title.rendered}</${this.headingLevel}></a>
                        <p class="date">${post.date.split("T")[0].replaceAll("-", "/")}</p>
                        <div class="excerpt">${post.excerpt.rendered}</div>
                        <a href="${post.link}" class="button"><button>Read More</button></a>
                    </div>
                </div>`;
            this.slidesWrapper.innerHTML += slide;
            this.pagination.innerHTML += `<div class="nav-bullet${(index == 0) ? " active" : ""}"></div>`;
        });

        this.init();
    }

    /**
     * Initializes infinite loop, autoplay and event listeners
     */
    init() {
        // Makes a copy of the last and first slide for infinite loop delusion
        if (this.infiniteLoop) {
            let firstSlideCopy = this.slidesWrapper.children[0].outerHTML;
            let lastSlideCopy = this.slidesWrapper.children[this.slidesWrapper.children.length - 1].outerHTML;
            this.slidesWrapper.innerHTML += firstSlideCopy;
            this.slidesWrapper.innerHTML = lastSlideCopy + this.slidesWrapper.innerHTML;
            this.currentSlide = 1;
            this.slide(false);
        }
        this.totalSlides = this.slidesWrapper.children.length;

        if (this.autoplay) {
            this.interval = setInterval(() => this.next(), this.autoplayInterval);
        }

        this.addEventListeners();
    }

    /**
     * Adds event listeners for slideshow interaction. If user load posts from other site, then
     * just add listeners for new pagination bullets. All user actions stop autoplay
     */
    addEventListeners() {
        if (!this.newLoad) {     
            this.previousButton.addEventListener("click", () => { this.previous() });
            this.nextButton.addEventListener("click", () => { this.next(true) });

            // Listen for reseting slider on end for infinite loop
            if (this.infiniteLoop) {
            this.slidesWrapper.addEventListener("transitionend", () => { this.checkReset() });
            }

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.code == "ArrowRight"){
                    this.next(true);
                } else if (e.code == "ArrowLeft") {
                    this.previous();
                }
            }, false);
            
            // Swiping navigation
            this.slideshow.addEventListener('touchstart', (e) => { this.touchStart(e) }, false);        
            this.slideshow.addEventListener('touchmove', (e) => { this.touchMove(e) }, false);
            this.slideshow.addEventListener('touchend', (e) => { this.touchEnd(e) }, false);

            // Responsive: update sliding offset (size) variable on window resizing
            window.addEventListener('resize', () => {
                this.size = this.slidesWrapper.clientWidth;
                this.slide(false);
            });
        }

        // Listener for pagination bullets
        if (this.infiniteLoop) {
            for (let i = 0; i < this.pagination.children.length; i++) {
                this.pagination.children[i].addEventListener("click", () => { this.goToSlide(i + 1) });
            }
        } else {
            for (let i = 0; i < this.pagination.children.length; i++) {
                this.pagination.children[i].addEventListener("click", () => { this.goToSlide(i) });
            }
        }
    }

    /**
     * Basic function of the slideshow that changes transform property of the
     * slides wrapper to generate the slide effect. Acepts not to display the
     * animation for infinite loop illusion, and other effects. If user swipe
     * the slideshow, the function shorts the transition for a right fit and
     * good user experience.
     * @param {Boolean} transition Show animation on sliding
     * @param {Number} touchMovement User swipe 
     */
    slide(transition, touchMovement = 0) {
        if (transition) {
            let shorting = (touchMovement != 0) ? (touchMovement * this.transition) / this.size : 0;
            this.slidesWrapper.style.transition = "transform " + Number(this.transition - Math.abs(shorting)) + "ms ease-in-out";
        } else {
            this.slidesWrapper.style.transition = "none";
        }
        this.slidesWrapper.style.transform = String("translateX(-" + Number((this.size * this.currentSlide) - touchMovement) + "px)").replace("--", "");
    }

    /**
     * Slide to previous post, having in account the infinite loop illusion.
     * If it's launched by swiping, pass the touch movement to slide function.
     * @param {Number} touchMovement User swipe
     * @returns 
     */
    previous(touchMovement = 0) {
        if (this.autoplay) {
            clearInterval(this.interval);
        }
        if (this.currentSlide == 0) {
            if (!this.infiniteLoop) return;
            this.slidesWrapper.style.left = "-" + (this.size * (this.totalSlides -1)) + "px";
        }
        this.updatePagination(this.currentSlide, this.currentSlide - 1);
        this.currentSlide--;
        this.slide(true, touchMovement);
    }

    /**
     * Slide to next post, having in account the infinite loop illusion.
     * If it's launched by swiping, pass the touch movement to slide function.
     * @param {Boolean} userAction The function is fired by user action or autoplay
     * @param {Number} touchMovement User swipe
     * @returns 
     */
    next(userAction = false, touchMovement = 0) {
        if (userAction && this.autoplay) {
            clearInterval(this.interval);
        }
        if (this.currentSlide == (this.totalSlides - 1)) {
            if (!this.infiniteLoop) return;
            this.slidesWrapper.style.left = (this.size * (this.currentSlide - 1)) + "px";
        }
        this.updatePagination(this.currentSlide, this.currentSlide + 1);
        this.currentSlide++;
        this.slide(true, touchMovement);
    }
    
    /**
     * Enables pagination navigation, event handler for navigation bullets
     * @param {Number} slide Post to slide to
     * @returns void
     */
    goToSlide(slide) {
        if (this.autoplay) {
            clearInterval(this.interval);
        }
        if(this.infiniteLoop) {
            if (slide == this.currentSlide + 1 || (this.currentSlide == this.totalSlides - 1 && slide == 2) || (this.currentSlide == this.totalSlides - 2 && slide == 1)) {
                this.next();
                return;
            }
            if (slide == this.currentSlide - 1 || (this.currentSlide == 1 && slide == this.totalSlides - 2)) {
                this.previous();
                return;
            }
        }
        this.updatePagination(this.currentSlide, slide);
        this.currentSlide = slide;
        this.slide(true);
    }

    /**
     * Touch start handler. Stores the initial point of touch, to be compared
     * in the futre with the touch end point, and fires checkReset to asure the user
     * can see a post in both sides when dragging if infinite loop is enabled.
     * @param {Event} e Touch event
     */
    touchStart(e) {
        if (this.autoplay) {
            clearInterval(this.interval);
        }
        if (this.infiniteLoop) {
            this.checkReset(true);
        }           
        this.xTouchStart = e.targetTouches[0].pageX;                                                                      
    }                                 
    
    /**
     * Allows user to drag the slider and store the final touch point;
     * @param {Event} e Touch event
     */
    touchMove(e) {    
        this.xTouchMove = e.targetTouches[0].pageX;
    
        let xDiff = this.xTouchStart - this.xTouchMove;
                                                                             
        this.slidesWrapper.style.left = -xDiff + "px";                                                              
    }

    /**
     * Evaluates if the user swipe is large enough to fire next or
     * previous functions, if not, returns to the current slide smoothly.
     * Finally, resets the touch variables.
     * @returns void
     */
    touchEnd() {     
        if (!this.xTouchMove) return;

        let xDiff = this.xTouchStart - this.xTouchMove;    
    
        if ( Math.abs(xDiff) > 100 ) {
            if ( xDiff > 0 ) {
                this.next(false, xDiff);
            } else {
                this.previous(xDiff);
            }
        } else {
            this.slide(true, xDiff);
        }

        this.xTouchStart = null;
        this.xTouchMove = null;
    };

    /**
     * Updates the states of the navigation bullets implied in the current sliding,
     * Reset parameters if out of bound for infinite loop
     * @param {Number} previous Previous slide
     * @param {Number} current Post that user or autoplay is sliding to
     */
    updatePagination(previous, current) {
        if (this.infiniteLoop) {
            previous--;
            current--;

            if (current == this.totalSlides - 2) {
                current = 0;
            } 
            if (previous == this.totalSlides - 2) {
                previous = 0;
            }
            if (current <= -1) {
                current = this.totalSlides - 3;
            }
            if (current >= this.totalSlides - 1) {
                current = 1;
            }
        }

        this.pagination.children[previous].classList.remove("active");
        this.pagination.children[current].classList.add("active");
    }

    /**
     * Fires only if infinite loop is enabled. Checks if given the current
     * slide, it needs to be reseted for infinite loop illusion.
     * @param {Boolean} touchStart If it is fired by user touch
     * @returns 
     */
    checkReset(touchStart = false) {
        if (touchStart && (this.currentSlide != this.totalSlides - 1)) {
            return;
        }
        this.slidesWrapper.style.left = "0px";
        if (this.currentSlide >= (this.totalSlides - 1)) {
            this.currentSlide = this.currentSlide - (this.totalSlides - 2);
        } else if (this.currentSlide <= 1) {
            this.currentSlide = this.currentSlide + (this.totalSlides - 2);
        }
        this.slide(false);
    }

    /**
     * Reload the slideshow with the posts content of the given website
     * @param {String} url Website url to pull new posts from
     */
    updatePosts(url) {
        this.newLoad = true;
        this.postsWebsite = url;
        this.slidesWrapper.innerHTML = "";
        this.pagination.innerHTML = "";
        this.currentSlide = 0;
        this.slide(false);
        clearInterval(this.interval);
        this.loadPosts();
    }
    
}

/**
 * Initializes and stores all the slideshows inside the document, I used an array 
 * in case of multiple instances of the block 
 * */
let postSlideshows = document.querySelectorAll(".wp-block-custom-block-post-slideshow");
var slideshows = [];

postSlideshows.forEach(slideshow => {
    slideshows.push(new PostSlidewhow(slideshow));
});