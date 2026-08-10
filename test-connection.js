setTimeout(() => {
  fetch('http://localhost:3000')
    .then(r => r.text())
    .then(console.log)
    .catch(console.error)
}, 3000)