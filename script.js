const form = document.getElementById('registrationForm');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const text = await response.text();
        if (response.ok) {
            alert("✅ Registration successful!");
            window.location.href = "/index.html";
        } else {
            alert("❌ " + text);
        }
    } catch (error) {
        message.textContent = 'Error: ' + error.message;
    }
});
