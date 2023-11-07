const messagesContainer = document.getElementById("messages-container");
let isScrolling = false;
const scrollDownBtn = document.getElementById("scrolldown-btn");
const scrollUpBtn = document.getElementById("scrollup-btn");
const middleSection = document.getElementById("middle-section");
const autoScrollBox = document.getElementById("auto-scroll-checkbox");
let shouldAutoScroll = autoScrollBox.checked;
console.log(shouldAutoScroll);
autoScrollBox.addEventListener("change", function () {
    shouldAutoScroll = this.checked;
    console.log("shouldAutoScroll: " + shouldAutoScroll);
    if (shouldAutoScroll) {
        scrollTo(false, false);
    }
});

scrollDownBtn.addEventListener("click", () => scrollTo(false, false));
scrollUpBtn.addEventListener("click", () => scrollTo(true, false));

// middleSection.addEventListener("click", function() { this.focus(); });
// middleSection.addEventListener("keydown", function (event) {
//   // Do something specific when up or down arrow key is pressed
//   switch (event.key) {
//     case "ArrowLeft":
//       // Left pressed
//       scrollTo(true, false);
//       break;
//     case "ArrowRight":
//       // Right pressed
//       scrollTo(false, false);
//       break;
//   }
// });

export function scrollIfNearBottom() {
    //   if (!isScrolling)
    //   {
    if (shouldAutoScroll) {
        console.log("scrolling down");
        let buffer = 65; // change this to increase/decrease the buffer
        let isAtBottom =
            messagesContainer.scrollHeight -
                messagesContainer.clientHeight -
                buffer <=
            messagesContainer.scrollTop;

        if (isAtBottom) {
            messagesContainer.scrollTop =
                messagesContainer.scrollHeight - messagesContainer.clientHeight;
        }
    }
}

export function scrollTo(isScrollUp, isInstant) {
    const start = messagesContainer.scrollTop;
    const end = isScrollUp
        ? 0
        : messagesContainer.scrollHeight - messagesContainer.clientHeight;

    // Check if the container is already at the destination
    if (start === end) {
        // console.log("Already at destination, not scrolling");
        return;
    }

    isScrolling = true;
    // console.log("scrolling");
    const duration = isInstant ? 0 : 500;

    let startTime = null;

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function step(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const t = Math.min(elapsed / duration, 1); // clamps t between 0 and 1
        const easedT = easeInOutCubic(t);
        messagesContainer.scrollTop = lerp(start, end, easedT);

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            isScrolling = false;
        }
    }

    requestAnimationFrame(step);
}

export function scrollToPosition(targetScrollTop, speed, isInstant) {
    const startScrollTop = messagesContainer.scrollTop;
    const timeStart = performance.now();

    if (isInstant) {
        messagesContainer.scrollTop = targetScrollTop;
        return;
    }

    function easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    function lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    function step(timeNow) {
        const t = Math.min(1, (timeNow - timeStart) / speed);
        const easedT = easeInOutCubic(t);
        messagesContainer.scrollTop = lerp(
            startScrollTop,
            targetScrollTop,
            easedT
        );

        if (t < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// export function scrollToPosition(scrollTop)
// {
//   messagesContainer.scrollTop = scrollTop;
// }
