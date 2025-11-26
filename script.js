// Global state
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is already logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    } else {
        showAuth();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showApp();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showAuth();
        }
    });

    initializeAuthListeners();
    initializeAppListeners();
});

// ===== AUTHENTICATION =====
function initializeAuthListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    const toggleSignupPassword = document.getElementById('toggleSignupPassword');

    // Toggle password visibility
    toggleLoginPassword.addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        togglePasswordVisibility(input, toggleLoginPassword);
    });

    toggleSignupPassword.addEventListener('click', () => {
        const input = document.getElementById('signupPassword');
        togglePasswordVisibility(input, toggleSignupPassword);
    });

    // Switch between login and signup
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });

    // Login
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showToast('Inserisci email e password!', 'error');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Accesso...';

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            showToast(error.message, 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Accedi <i class="fa-solid fa-right-to-bracket"></i>';
        } else {
            showToast('Accesso effettuato!', 'success');
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        }
    });

    // Signup
    signupBtn.addEventListener('click', async () => {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!email || !password) {
            showToast('Inserisci email e password!', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('La password deve essere di almeno 6 caratteri!', 'error');
            return;
        }

        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Registrazione...';

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            showToast(error.message, 'error');
            signupBtn.disabled = false;
            signupBtn.innerHTML = 'Registrati <i class="fa-solid fa-user-plus"></i>';
        } else {
            showToast('Registrazione completata! Accedi ora.', 'success');
            document.getElementById('signupEmail').value = '';
            document.getElementById('signupPassword').value = '';
            // Switch to login form
            setTimeout(() => {
                document.getElementById('signupForm').style.display = 'none';
                document.getElementById('loginForm').style.display = 'block';
                signupBtn.disabled = false;
                signupBtn.innerHTML = 'Registrati <i class="fa-solid fa-user-plus"></i>';
            }, 1500);
        }
    });

    // Handle Enter key
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginBtn.click();
    });

    document.getElementById('signupPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') signupBtn.click();
    });
}

// ===== MAIN APP =====
function initializeAppListeners() {
    const serviceInput = document.getElementById('serviceName');
    const passwordInput = document.getElementById('password');
    const saveBtn = document.getElementById('saveBtn');
    const toggleInputPasswordBtn = document.getElementById('toggleInputPassword');
    const logoutBtn = document.getElementById('logoutBtn');

    // Toggle password visibility
    toggleInputPasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, toggleInputPasswordBtn);
    });

    // Save Password
    saveBtn.addEventListener('click', async () => {
        const service = serviceInput.value.trim();
        const password = passwordInput.value.trim();

        if (!service || !password) {
            showToast('Inserisci sia il nome del servizio che la password!', 'error');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...';

        const { data, error } = await supabase
            .from('passwords')
            .insert([
                {
                    user_id: currentUser.id,
                    service_name: service,
                    password: password
                }
            ])
            .select();

        if (error) {
            showToast('Errore nel salvataggio: ' + error.message, 'error');
        } else {
            showToast('Password salvata con successo!', 'success');
            serviceInput.value = '';
            passwordInput.value = '';
            passwordInput.setAttribute('type', 'password');
            toggleInputPasswordBtn.querySelector('i').classList.add('fa-eye');
            toggleInputPasswordBtn.querySelector('i').classList.remove('fa-eye-slash');
            loadPasswords();
        }

        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Salva Password <i class="fa-solid fa-floppy-disk"></i>';
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        showToast('Disconnesso!', 'success');
    });

    // Delete Account
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const firstConfirm = confirm('⚠️ ATTENZIONE! Stai per eliminare il tuo account e TUTTE le password salvate.\n\nQuesta azione è irreversibile. Sei sicuro di voler continuare?');

            if (!firstConfirm) return;

            const secondConfirm = confirm('🚨 ULTIMA CONFERMA!\n\nL\'account verrà eliminato definitivamente. Confermi?');

            if (!secondConfirm) return;

            deleteAccountBtn.disabled = true;
            deleteAccountBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Sessione non valida');

                const response = await fetch('https://zhgpccmzgyertwnvyiaz.supabase.co/functions/v1/delete-account', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Errore durante l\'eliminazione');
                }

                alert('Account eliminato con successo. Verrai reindirizzato alla pagina di login.');
                await supabase.auth.signOut();
                window.location.reload();

            } catch (error) {
                console.error('Errore:', error);
                showToast('Errore: ' + error.message, 'error');
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.innerHTML = '<i class="fa-solid fa-user-xmark"></i>';
            }
        });
    }

    // Delete All Passwords
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async () => {
            const firstConfirm = confirm('⚠️ ATTENZIONE! Stai per eliminare TUTTE le password salvate.\n\nQuesta azione è irreversibile. Sei sicuro di voler continuare?');

            if (!firstConfirm) return;

            const secondConfirm = confirm('🚨 ULTIMA CONFERMA!\n\nTutte le password verranno eliminate definitivamente. Confermi?');

            if (!secondConfirm) return;

            deleteAllBtn.disabled = true;
            deleteAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminazione...';

            try {
                const { error } = await supabase
                    .from('passwords')
                    .delete()
                    .eq('user_id', currentUser.id);

                if (error) {
                    throw new Error(error.message);
                }

                showToast('Tutte le password sono state eliminate!', 'success');
                loadPasswords();

            } catch (error) {
                console.error('Errore:', error);
                showToast('Errore: ' + error.message, 'error');
            } finally {
                deleteAllBtn.disabled = false;
                deleteAllBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Elimina Tutto';
            }
        });
    }

    // Handle Enter key
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });
}

async function loadPasswords() {
    const passwordList = document.getElementById('passwordList');

    const { data: passwords, error } = await supabase
        .from('passwords')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        showToast('Errore nel caricamento delle password', 'error');
        return;
    }

    passwordList.innerHTML = '';

    if (passwords.length === 0) {
        passwordList.innerHTML = `
            <div class="empty-state">
                <p>Nessuna password salvata.</p>
            </div>
        `;
        return;
    }

    passwords.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'password-item';

        item.innerHTML = `
            <div class="service-info">
                <div class="service-name">${escapeHtml(entry.service_name)}</div>
                <div class="service-password" data-hidden="true">••••••••</div>
            </div>
            <div class="item-actions">
                <button class="action-btn toggle-visibility" title="Mostra/Nascondi" data-password="${escapeHtml(entry.password)}">
                    <i class="fa-regular fa-eye"></i>
                </button>
                <button class="action-btn copy" title="Copia Password" data-password="${escapeHtml(entry.password)}">
                    <i class="fa-regular fa-copy"></i>
                </button>
                <button class="action-btn delete" title="Elimina" data-id="${entry.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        // Event Listeners for actions
        const toggleBtn = item.querySelector('.toggle-visibility');
        const passwordDisplay = item.querySelector('.service-password');

        toggleBtn.addEventListener('click', () => {
            const isHidden = passwordDisplay.dataset.hidden === 'true';
            if (isHidden) {
                passwordDisplay.textContent = toggleBtn.dataset.password;
                passwordDisplay.dataset.hidden = 'false';
                toggleBtn.querySelector('i').classList.remove('fa-eye');
                toggleBtn.querySelector('i').classList.add('fa-eye-slash');
            } else {
                passwordDisplay.textContent = '••••••••';
                passwordDisplay.dataset.hidden = 'true';
                toggleBtn.querySelector('i').classList.add('fa-eye');
                toggleBtn.querySelector('i').classList.remove('fa-eye-slash');
            }
        });

        const copyBtn = item.querySelector('.copy');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(copyBtn.dataset.password).then(() => {
                showToast('Password copiata!', 'success');
            });
        });

        const deleteBtn = item.querySelector('.delete');
        deleteBtn.addEventListener('click', async () => {
            if (confirm(`Sei sicuro di voler eliminare la password per ${entry.service_name}?`)) {
                const { error } = await supabase
                    .from('passwords')
                    .delete()
                    .eq('id', entry.id);

                if (error) {
                    showToast('Errore nell\'eliminazione', 'error');
                } else {
                    showToast('Password eliminata.', 'success');
                    loadPasswords();
                }
            }
        });

        passwordList.appendChild(item);
    });
}

// ===== UTILITY FUNCTIONS =====
function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('footerEmail').textContent = currentUser.email;

    // Initialize Delete All button listener (now that it's visible)
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn && !deleteAllBtn.hasAttribute('data-listener-attached')) {
        deleteAllBtn.setAttribute('data-listener-attached', 'true');
        deleteAllBtn.addEventListener('click', async () => {
            const firstConfirm = confirm('⚠️ ATTENZIONE! Stai per eliminare TUTTE le password salvate. Questa azione è irreversibile!\n\nSei sicuro di voler continuare?');

            if (!firstConfirm) return;

            const secondConfirm = confirm('🚨 ULTIMA CONFERMA!\n\nDigita OK mentalmente e clicca su OK per eliminare definitivamente tutto l\'archivio password.');

            if (!secondConfirm) return;

            deleteAllBtn.disabled = true;
            deleteAllBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminazione...';

            // Delete all passwords for current user
            const { error } = await supabase
                .from('passwords')
                .delete()
                .eq('user_id', currentUser.id);


            if (error) {
                showToast('Errore nell\'eliminazione: ' + error.message, 'error');
                deleteAllBtn.disabled = false;
                deleteAllBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Elimina Tutto';
            } else {
                showToast('Archivio eliminato completamente!', 'success');
                deleteAllBtn.disabled = false;
                deleteAllBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Elimina Tutto';
                loadPasswords();
            }
        });
    }

    loadPasswords();
}

function togglePasswordVisibility(input, button) {
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);

    const icon = button.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = type === 'success' ? '<i class="fa-solid fa-check-circle"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';

    if (type === 'error') {
        toast.style.borderColor = 'var(--danger-color)';
        toast.style.color = 'var(--danger-color)';
    }

    toast.innerHTML = `${icon} <span>${message}</span>`;
    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
