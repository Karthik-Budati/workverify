const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

console.log('Starting WorkVerify server (version: 2025-05-18-decentralized)');

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, req.body);
  next();
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  console.log('Serving index.html');
  res.sendFile('index.html', { root: 'public' });
});

// Mock data sources (in-memory for demo)
const mockLinkedIn = [
  { name: 'Alice Kumar', company: 'Google', title: 'Software Engineer', startYear: 2015, endYear: 2020, profileUrl: 'https://linkedin.com/in/alicekumar' },
  { name: 'Ravi Teja', company: 'Amazon', title: 'Intern', startYear: 2018, endYear: 2019, profileUrl: 'https://linkedin.com/in/raviteja' }
];

const mockGitHub = [
  { name: 'Alice Kumar', company: 'Google', commits: 2015, lastActive: 2020 },
  { name: 'Sara Johnson', company: 'Freelance', commits: 2017, lastActive: 2024 }
];

const mockBlockchain = [];
const mockArchivedWeb = [
  { name: 'Bob Smith', company: 'CryptoStartup', title: 'Developer', startYear: 2015, endYear: 2017 }
];
const mockGigWork = [
  { name: 'Sara Johnson', company: 'Upwork', title: 'Web Developer', tasks: 50, startYear: 2017, endYear: 2024 }
];

// Mock APIs
app.get('/mock-linkedin', async (req, res) => {
  res.json(mockLinkedIn);
});

app.get('/mock-github', async (req, res) => {
  res.json(mockGitHub);
});

app.get('/mock-blockchain', async (req, res) => {
  res.json(mockBlockchain);
});

app.get('/mock-archived-web', async (req, res) => {
  res.json(mockArchivedWeb);
});

app.get('/mock-gig-work', async (req, res) => {
  res.json(mockGigWork);
});

app.post('/mock-blockchain', async (req, res) => {
  try {
    const { name, company, title, start_year, end_year, profile_url } = req.body;
    if (!name || !company || !title || !start_year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const profile = {
      name,
      company,
      title,
      startYear: parseInt(start_year),
      endYear: end_year ? parseInt(end_year) : null,
      profileUrl: profile_url || ''
    };
    mockBlockchain.push(profile);
    console.log(`Added profile to blockchain: ${name}, ${company}`);
    res.json({ message: 'Profile added to blockchain' });
  } catch (error) {
    console.error('Error adding to blockchain:', error.message);
    res.status(500).json({ error: `Failed to add profile: ${error.message}` });
  }
});

function calculateDuration(startYear, endYear) {
  const start = new Date(startYear, 0, 1);
  const end = endYear ? new Date(endYear, 11, 31) : new Date();
  const years = (end - start) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years);
}

app.post('/workverify', async (req, res) => {
  try {
    const { name, company, title, start_year, end_year } = req.body;
    if (!name || !company || !title || start_year === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (isNaN(start_year) || (end_year && isNaN(end_year))) {
      return res.status(400).json({ error: 'Years must be valid numbers' });
    }
    if (start_year < 1900 || start_year > 2025 || (end_year && (end_year < 1900 || end_year > 2025))) {
      return res.status(400).json({ error: 'Years must be between 1900 and 2025' });
    }
    if (end_year && end_year < start_year) {
      return res.status(400).json({ error: 'End year cannot be before start year' });
    }

    // Aggregate data from mock sources
    const sources = [
      { name: 'LinkedIn', data: mockLinkedIn },
      { name: 'GitHub', data: mockGitHub },
      { name: 'Blockchain', data: mockBlockchain },
      { name: 'Archived Web', data: mockArchivedWeb },
      { name: 'Gig Work', data: mockGigWork }
    ];

    let matches = [];
    let dataSources = [];
    for (const source of sources) {
      const profiles = source.data.filter(p =>
        p.name.toLowerCase() === name.toLowerCase() &&
        p.company.toLowerCase() === company.toLowerCase()
      );
      if (profiles.length) {
        dataSources.push(source.name);
        matches.push(...profiles.map(p => ({
          ...p,
          source: source.name,
          years: p.startYear && p.endYear ? calculateDuration(p.startYear, p.endYear) : (p.tasks ? Math.floor(p.tasks / 10) : null)
        })));
      }
    }

    if (!matches.length) {
      return res.status(404).json({ status: 'Unverified', message: 'No matching profile found', confidence: 0 });
    }

    // Compute confidence
    let confidence = 0;
    let bestMatch = null;
    let edgeCaseNotes = [];

    for (const match of matches) {
      let score = 100;
      if (match.title?.toLowerCase() !== title.toLowerCase()) score -= 30;
      if (match.startYear && start_year < match.startYear) score -= 15;
      if (match.endYear && end_year && end_year > match.endYear) score -= 15;
      if (match.years && calculateDuration(start_year, end_year) > match.years + 1) score -= 20;

      if (match.source === 'Archived Web') edgeCaseNotes.push('Defunct company detected');
      if (match.source === 'Gig Work') edgeCaseNotes.push('Gig work validated via task history');
      if (!match.endYear) edgeCaseNotes.push('Open-ended employment');

      if (score > confidence) {
        confidence = score;
        bestMatch = match;
      }
    }

    confidence = Math.max(0, confidence);
    const status = confidence >= 70 ? 'Verified' : confidence >= 40 ? 'Suspicious' : 'Unverified';

    const claim = {
      name: bestMatch.name,
      company: bestMatch.company,
      title: bestMatch.title || title,
      years: bestMatch.years || calculateDuration(start_year, end_year),
      verified: status === 'Verified',
      timestamp: new Date().toISOString()
    };

    res.json({
      status,
      confidence,
      claim,
      dataSources,
      edgeCaseNotes
    });
  } catch (error) {
    console.error('Verification error:', error.message);
    res.status(500).json({ error: `Verification failed: ${error.message}` });
  }
});

app.post('/validate-proof', async (req, res) => {
  try {
    const { claim, signature, publicKey } = req.body;
    if (!claim || !signature || !publicKey) {
      return res.status(400).json({ error: 'Missing proof components' });
    }

    // Mock verification (since client signs)
    const claimString = JSON.stringify(claim, Object.keys(claim).sort());
    const isValid = signature === btoa(claimString);

    if (!isValid) {
      throw new Error('Signature does not match claim');
    }

    res.json({ valid: true, message: 'Proof is valid and untampered' });
  } catch (error) {
    console.error('Proof validation error:', error.message);
    res.status(400).json({ valid: false, message: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message);
  res.status(500).json({ error: `Unexpected server error: ${err.message}` });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});