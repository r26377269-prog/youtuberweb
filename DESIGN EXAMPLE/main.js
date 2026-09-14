let typeText = ["hello", "Ram", "Ram ji"];
let typeContent = document.querySelector(".typing");
let wordIndex = 0;
let charIndex = 0;
let removeChar = false;
function typing() {
  let currentIndex = typeText[wordIndex];
  let currentChar = currentIndex.substring(0, charIndex);

  typeContent.innerHTML = currentChar;

  if (!removeChar && charIndex < currentIndex.length) {
    charIndex++;
    setTimeout(typing, 100);
  } else if (removeChar && charIndex > 0) {
    charIndex--;
    setTimeout(typing, 100);
  } else {
    removeChar = !removeChar;
    wordIndex = !removeChar ? (wordIndex + 1) % typeText.length : wordIndex;
    setTimeout(typing, 100);
  }
}

typing();

const lenis = new Lenis();

lenis.on("scroll", (e) => {
  // console.log(e);
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);
// gsap start

gsap.registerPlugin(TextPlugin)
gsap.registerPlugin(ScrollTrigger) 


const tl = gsap.timeline();

tl.from(".a1, .a2, .a3, .a4", {
  y: -50,
  opacity: 0,
  duration: 0.8,
  stagger: 0.2,
  ease: "power2.out"
});

tl.fromTo(
  "#content",
  { y: -60, opacity: 0 },   // 👈 upar se start
  { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, // 👈 exact jagah par end
  "-=0.4"
);

gsap.to(".welcome1", {
  duration: 1,
  text: "welcome",
  ease: "none",
  repeat:0,
  yoyo:true,
});

gsap.to(".videospace", {
  width: "99%",
  height: "81%",
  scrollTrigger: {
    trigger: ".videospace",
    // markers : true,
    start: "top 10%",
    end: "top 50%",
    scrub: 1.5,
  },
});

gsap.to(".complex_text", {
  width: "90%",
  scrollTrigger: {
    trigger: ".sticky",
    start: "top 10%",
    end: "top 100%",
    // markers: true,
    scrub: 2,
  }
});


gsap.to(".rotate",{
  rotate:360,
  x:520,
  scrollTrigger:{
    trigger:".text_scroll",
    start:"top 50%",
    end:"top 0%",
    // markers:true,
    scrub:true,
  }
})
let scroll_element = document.querySelectorAll(".scroll_element");

scroll_element.forEach((element, index) => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: element,
      // markers: true,
      start: "top 50%",
      end: "top 20%",
      scrub: 2,
    },
  });
  
  tl.to(element, {
    opacity : 1,
    duration : .7
  });
  
  
  tl.to(element, {
    opacity : .2,
    duration : .7
  })
  
});

gsap.to(".section_last h1",{
  transform : "translateX(-100%)",
  scrollTrigger:{
    trigger:".section_last",
    start:"top 10%",
    end:"top 0%",
    // markers:true,
    scrub:10,
  }
})