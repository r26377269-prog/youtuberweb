// Animated Subscriber Count-Up Logic

function animateCountUp(elementId, targetValue, duration = 2500) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startValue = 0;
  const startTime = performance.now();
  const numericTarget = parseInt(targetValue, 10) || 0;

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easeOutExpo transition
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const currentValue = Math.floor(startValue + easeProgress * (numericTarget - startValue));

    el.innerText = currentValue.toLocaleString('en-US');

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      el.innerText = numericTarget.toLocaleString('en-US');
    }
  }

  requestAnimationFrame(updateCount);
}

window.animateCountUp = animateCountUp;
