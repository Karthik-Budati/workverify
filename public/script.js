
// public/script.js

// Simple client-side RSA for demo (in production, use Web Crypto API or library)
function generateKeyPair() {
  // Simulated key pair (for demo, not cryptographically secure)
  return {
    publicKey: '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCq...\n-----END PUBLIC KEY-----',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIICdwIBADANBgkqhkiG9w0BAQEFAASCAmEwgg...\n-----END PRIVATE KEY-----'
  };
}

function signClaim(claim, privateKey) {
  // Simulated signing (for demo, use crypto.subtle in production)
  const claimString = JSON.stringify(claim, Object.keys(claim).sort());
  return btoa(claimString); // Mock base64 signature
}

// Navigation button handlers
const navButtons = {
  'show-verify': 'verify-section',
  'show-add-profile': 'add-profile-section',
  'show-validate-proof': 'validate-proof-section'
};

Object.keys(navButtons).forEach(btnId => {
  document.getElementById(btnId).addEventListener('click', () => {
    document.querySelectorAll('.form-section').forEach(section => {
      section.classList.add('hidden');
    });
    const sectionId = navButtons[btnId];
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelectorAll('.form-nav-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.backgroundColor = '';
    });
    const activeBtn = document.getElementById(btnId);
    activeBtn.classList.add('active');
    activeBtn.style.backgroundColor = '#1a202c';
  });
});

// Initialize with Verify Employment form visible
document.getElementById('show-verify').click();

// Clear Verify Employment form
document.getElementById('clear-verify').addEventListener('click', () => {
  document.getElementById('verify-form').reset();
  document.getElementById('verify-result').classList.add('hidden');
  document.getElementById('verify-result').innerHTML = '';
});

// Verify Employment form submission
document.getElementById('verify-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const formData = {
      name: document.getElementById('name').value,
      company: document.getElementById('company').value,
      title: document.getElementById('title').value,
      start_year: document.getElementById('start_year').value,
      end_year: document.getElementById('end_year').value || undefined
    };
    console.log('Sending /workverify request:', formData);
    const response = await fetch('/workverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    console.log('Verification result:', data);

    // Generate client-side proof
    const keyPair = generateKeyPair();
    const claim = data.claim;
    const signature = signClaim(claim, keyPair.privateKey);

    // Display result
    const resultDiv = document.getElementById('verify-result');
    let resultHtml = `<h3 class="text-lg font-semibold text-gray-800">Verification Result</h3>`;
    resultHtml += `<p><strong>Status:</strong> ${data.status}</p>`;
    resultHtml += `<p><strong>Confidence:</strong> ${data.confidence}%</p>`;
    if (data.message) resultHtml += `<p><strong>Message:</strong> ${data.message}</p>`;
    if (data.dataSources?.length) resultHtml += `<p><strong>Sources:</strong> ${data.dataSources.join(', ')}</p>`;
    if (data.edgeCaseNotes?.length) resultHtml += `<p><strong>Notes:</strong> ${data.edgeCaseNotes.join(', ')}</p>`;
    
    // Highlight input mismatches
    let mismatches = [];
    if (data.claim && data.confidence < 100) {
      if (formData.title.toLowerCase() !== data.claim.title.toLowerCase()) {
        mismatches.push(`Title mismatch: Input '${formData.title}' vs. Profile '${data.claim.title}'`);
      }
      const inputYears = formData.end_year ? (formData.end_year - formData.start_year) : (new Date().getFullYear() - formData.start_year);
      if (inputYears > data.claim.years + 1) {
        mismatches.push(`Years mismatch: Input ~${inputYears} years vs. Profile ${data.claim.years} years`);
      }
    }
    if (mismatches.length) {
      resultHtml += `<p><strong>Mismatches:</strong> ${mismatches.join('; ')}</p>`;
    }

    if (data.claim) {
      document.getElementById('claim').value = JSON.stringify(data.claim, null, 2);
      document.getElementById('signature').value = signature;
      document.getElementById('publicKey').value = keyPair.publicKey;
      resultHtml += `<p class="text-green-600">Proof generated for profile data: ${data.claim.name}, ${data.claim.company}, ${data.claim.title}, ${data.claim.years} years</p>`;
      resultHtml += `<p>Validate Proof form populated. <a href="#" id="go-validate-proof" class="text-blue-600 underline">Go to Validate Proof</a></p>`;
    } else {
      console.warn('No claim data in response');
      resultHtml += `<p class="text-yellow-600">Warning: No proof data returned</p>`;
    }
    resultDiv.innerHTML = resultHtml;
    resultDiv.classList.remove('hidden');

    // Delay auto-switch to show result
    if (data.claim) {
      setTimeout(() => {
        document.getElementById('show-validate-proof').click();
      }, 2000); // 2-second delay
    }

    // Add click handler for "Go to Validate Proof" link
    document.getElementById('go-validate-proof')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('show-validate-proof').click();
    });
  } catch (error) {
    console.error('Failed to verify:', error);
    const resultDiv = document.getElementById('verify-result');
    resultDiv.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
    resultDiv.classList.remove('hidden');
  }
});

// Add Profile form submission (now submits to mock blockchain)
document.getElementById('add-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const formData = {
      name: document.getElementById('add_name').value,
      company: document.getElementById('add_company').value,
      title: document.getElementById('add_title').value,
      start_year: document.getElementById('add_start_year').value,
      end_year: document.getElementById('add_end_year').value || undefined,
      profile_url: document.getElementById('add_profile_url').value || undefined
    };
    console.log('Sending /mock-blockchain request:', formData);
    const response = await fetch('/mock-blockchain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    const resultDiv = document.getElementById('add-profile-result');
    resultDiv.innerHTML = `<p class="text-green-600">${data.message || 'Profile added to blockchain'}</p>`;
    resultDiv.classList.remove('hidden');
    document.getElementById('add-profile-form').reset();
    console.log('Add profile result:', data);
  } catch (error) {
    console.error('Failed to add profile:', error);
    const resultDiv = document.getElementById('add-profile-result');
    resultDiv.innerHTML = `<p class="text-red-600">Error: ${error.message}</p>`;
    resultDiv.classList.remove('hidden');
  }
});

// Validate Proof form submission
document.getElementById('validate-proof-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const formData = {
      claim: JSON.parse(document.getElementById('claim').value),
      signature: document.getElementById('signature').value,
      publicKey: document.getElementById('publicKey').value
    };
    console.log('Sending /validate-proof request:', formData);
    const response = await fetch('/validate-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    console.log('Validate proof result:', data);

    const resultDiv = document.getElementById('validate-proof-result');
    let resultHtml = `<h3 class="text-lg font-semibold text-gray-800">Proof Validation Result</h3>`;
    resultHtml += `<p><strong>Status:</strong> ${data.valid ? 'Valid' : 'Invalid'}</p>`;
    if (data.valid) {
      resultHtml += `<p class="text-green-600">${data.message}</p>`;
    } else {
      resultHtml += `<p><strong>Reason:</strong> ${data.message}</p>`;
      if (data.message.includes('Signature does not match claim')) {
        resultHtml += `<p class="text-red-600">Possible tampering detected: The signature does not correspond to the provided claim.</p>`;
      } else if (data.message.includes('Invalid PEM format')) {
        resultHtml += `<p class="text-red-600">The public key is malformed or not in valid PEM format.</p>`;
      } else if (data.message.includes('Claim must be a valid object')) {
        resultHtml += `<p class="text-red-600">The claim JSON is not a valid object.</p>`;
      } else if (data.message.includes('Invalid base64 signature')) {
        resultHtml += `<p class="text-red-600">The signature is not a valid base64 string.</p>`;
      } else {
        resultHtml += `<p class="text-red-600">Check the claim, signature, and public key for correctness.</p>`;
      }
    }
    resultDiv.innerHTML = resultHtml;
    resultDiv.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to validate proof:', error);
    const resultDiv = document.getElementById('validate-proof-result');
    let resultHtml = `<h3 class="text-lg font-semibold text-gray-800">Proof Validation Error</h3>`;
    resultHtml += `<p class="text-red-600">Error: ${error.message}</p>`;
    if (error.message.includes('Unexpected token') || error.message.includes('JSON')) {
      resultHtml += `<p class="text-red-600">Invalid Claim JSON: Ensure the Claim JSON is properly formatted.</p>`;
    }
    resultDiv.innerHTML = resultHtml;
    resultDiv.classList.remove('hidden');
  }
});

// Fetch profiles for autocomplete (optional)
async function fetchProfiles() {
  try {
    const response = await fetch('/mock-linkedin', {
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    console.log('Profiles:', data);
  } catch (error) {
    console.error('Failed to fetch profiles:', error);
  }
}

fetchProfiles();