// Legitimate UPI Payment Intent Generator & Handler

function generateUpiIntentUrl(upiId, name, amount, note = 'Creator Support') {
  const cleanUpiId = encodeURIComponent(upiId || 'creator@upi');
  const cleanName = encodeURIComponent(name || 'Creator Name');
  const cleanAmount = encodeURIComponent(amount || '100');
  const cleanNote = encodeURIComponent(note);

  // Standardized UPI Payment Intent URI Scheme
  return `upi://pay?pa=${cleanUpiId}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
}

function handleUpiPayment(event) {
  event.preventDefault();
  
  const upiId = document.getElementById('support-upi-id-val')?.innerText || 'creator@upi';
  const creatorName = document.getElementById('support-creator-name-val')?.innerText || 'ALEX VANCE';
  const amountInput = document.getElementById('upi-custom-amount');
  const amount = amountInput ? amountInput.value : '100';

  if (!amount || Number(amount) <= 0) {
    alert('Please enter a valid support amount in ₹');
    return;
  }

  const intentUrl = generateUpiIntentUrl(upiId, creatorName, amount, 'Creator Support');

  // Trigger UPI App Intent on Mobile or Desktop Deep Link Handlers
  window.location.href = intentUrl;

  // Display user verification notice modal/toast
  const noticeEl = document.getElementById('upi-payment-feedback');
  if (noticeEl) {
    noticeEl.style.display = 'block';
    noticeEl.innerHTML = `
      <div style="background: rgba(230,192,100,0.15); border: 1px solid #e6c064; padding: 16px; border-radius: 12px; margin-top: 20px;">
        <h4 style="color: #e6c064; margin-bottom: 5px;">📲 Opening Your UPI App...</h4>
        <p style="font-size: 0.9rem; color: #d1d5db; margin: 0;">
          Your UPI payment app (Google Pay, PhonePe, Paytm, BHIM) will open to complete the ₹${amount} transfer to <strong>${creatorName}</strong> (${upiId}).
        </p>
        <p style="font-size: 0.8rem; color: #9ca3af; margin-top: 8px;">
          Note: Payment verification is handled securely inside your bank's UPI app. This website never collects or stores banking passwords or credentials.
        </p>
      </div>
    `;
  }
}

function copyUpiId() {
  const upiId = document.getElementById('support-upi-id-val')?.innerText || 'creator@upi';
  navigator.clipboard.writeText(upiId).then(() => {
    const btn = document.getElementById('btn-copy-upi');
    if (btn) {
      const orig = btn.innerText;
      btn.innerText = 'COPIED! ✓';
      btn.style.background = '#22c55e';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.innerText = orig;
        btn.style.background = '#e6c064';
        btn.style.color = '#0d0a02';
      }, 2000);
    }
  }).catch(err => {
    console.error('Could not copy UPI ID:', err);
  });
}

function setPresetAmount(amount) {
  const input = document.getElementById('upi-custom-amount');
  if (input) {
    input.value = amount;
  }
  document.querySelectorAll('.btn-preset').forEach(btn => {
    if (btn.dataset.amount === String(amount)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

window.handleUpiPayment = handleUpiPayment;
window.copyUpiId = copyUpiId;
window.setPresetAmount = setPresetAmount;
