const fs = require('fs');

try {
  const harContent = fs.readFileSync('C:\\Users\\NguyenDai\\Downloads\\dnis.dongnai.gov.vn.har', 'utf8');
  const har = JSON.parse(harContent);
  
  const dwrRequests = har.log.entries.filter(e => e.request.url.includes('DataRemoting.getDoc.dwr'));
  console.log(`Found ${dwrRequests.length} DWR requests.`);
  
  dwrRequests.forEach((entry, i) => {
      const postData = entry.request.postData ? entry.request.postData.text : '';
      if (postData.includes('getLogXuLyVanBan') || postData.includes('getDcmTrackActivitiLog')) {
          console.log(`\n--- DWR Request ${i+1} ---`);
          console.log('Payload:', postData);
          
          if (entry.response.content && entry.response.content.text) {
              const text = entry.response.content.text;
              console.log('Response (first 500 chars):', text.substring(0, 500));
              
              // Try to find the exact HTML payload
              const match = text.match(/s0="(.*?)";/);
              if (match) {
                 const unescaped = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                 console.log('\nExtracted HTML (first 1000 chars):\n', unescaped.substring(0, 1000));
              }
          }
      }
  });
} catch (e) {
  console.error(e);
}
