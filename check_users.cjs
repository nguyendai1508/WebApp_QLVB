const fetch = require('node-fetch');
fetch('https://qlvb-phurieng-default-rtdb.asia-southeast1.firebasedatabase.app/users.json')
  .then(r => r.json())
  .then(data => {
    const suong = Object.values(data).filter(u => u.username === 'suongntn.ubxphurieng');
    console.log(JSON.stringify(suong, null, 2));
  });
