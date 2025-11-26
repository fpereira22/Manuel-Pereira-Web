// --- CONFIGURACIÓN API GEMINI ---
const apiKey = ""; // Se inyectará en tiempo de ejecución

// Función auxiliar para llamar a Gemini
const callGemini = async (prompt, systemInstruction = "") => {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemInstruction }] },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Error API: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar respuesta.";
    } catch (error) {
        console.error("Error al llamar a Gemini:", error);
        return "Lo siento, hubo un error al conectar con la IA.";
    }
};

// --- DATOS DE PRUEBA ---
const initialPhotos = [
    { id: 1, category: 'pajaros', title: 'Pequén', description: 'Un Pequeño búho nativo de América, conocido por sus hábitos terrestres y diurnos sobre un poste en Paine.', date: '22 de Septiembre del 2025', url: 'public/imgs/pequen.jpg' },
    { id: 2, category: 'macro', title: 'Abeja en Flor', description: 'Un acercamiento íntimo al trabajo incansable de una abeja recolectando polen.', date: '2024-01-10', url: 'public/imgs/abeja.jpg' },
    { id: 3, category: 'futbol', title: 'Gol del Domingo', description: 'El momento exacto de la celebración en la liga local.', date: '2023-12-05', url: 'public/imgs/fut1.jpg' },
    { id: 4, category: 'pajaros', title: 'Martín Pescador', description: 'Paciencia y precisión junto al río Maipo.', date: '2023-10-22', url: 'public/imgs/pajaro.jpg' },
    { id: 5, category: 'macro', title: 'Flor', description: 'Gotas de agua magnificadas sobre una hoja al amanecer.', date: '2024-02-01', url: 'public/imgs/macro2.jpg' },
    { id: 6, category: 'futbol', title: 'Entrenamiento', description: 'Esfuerzo y dedicación en la cancha.', date: '2023-12-12', url: 'public/imgs/fut2.jpg' },
];

// --- ESTADO GLOBAL ---
let photos = [...initialPhotos];
let activeTab = 'todos';
let chatMessages = [
    { sender: 'bot', text: '¡Hola! Soy la versión IA de Manuel. Pregúntame sobre mis fotos, Paine o mi pasión por el fútbol.' }
];
let isChatOpen = false;
let isGenerating = false;
let newPhoto = { title: '', description: '', category: 'pajaros', file: null };
let previewUrl = null;

// --- DOM ELEMENTS ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Lucide Icons
    lucide.createIcons();

    // Renderizar Galería Inicial
    renderGallery();

    // Event Listeners para Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTab = e.target.dataset.tab;
            updateActiveTabStyles();
            renderGallery();
        });
    });

    // Modal Upload
    const modal = document.getElementById('uploadModal');
    const openModalBtn = document.getElementById('openUploadModal');
    const closeModalBtn = document.getElementById('closeUploadModal');

    openModalBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // File Input
    const fileInput = document.getElementById('fileInput');
    const fileDropZone = document.getElementById('fileDropZone');
    const previewContainer = document.getElementById('previewContainer');

    fileDropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newPhoto.file = file;
            previewUrl = URL.createObjectURL(file);
            renderPreview();
            checkFormValidity();
        }
    });

    // Form Inputs
    document.getElementById('photoTitle').addEventListener('input', (e) => {
        newPhoto.title = e.target.value;
        checkFormValidity();
    });

    document.getElementById('photoCategory').addEventListener('change', (e) => {
        newPhoto.category = e.target.value;
    });

    document.getElementById('photoDescription').addEventListener('input', (e) => {
        newPhoto.description = e.target.value;
    });

    // Generate Description
    document.getElementById('generateDescBtn').addEventListener('click', async () => {
        if (!newPhoto.title) {
            alert("Por favor escribe un título primero para ayudar a la IA.");
            return;
        }

        const btn = document.getElementById('generateDescBtn');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="loader" class="animate-spin w-4 h-4"></i> Creando Historia...`;
        lucide.createIcons();
        btn.disabled = true;

        const prompt = `
        Genera una descripción breve, poética y evocadora (máximo 25 palabras) para una fotografía titulada "${newPhoto.title}"
        que pertenece a la categoría "${newPhoto.category}".
        El fotógrafo es Manuel Pereira, un aficionado de Paine, Chile, que ama la naturaleza.
        `;

        const generatedText = await callGemini(prompt);
        newPhoto.description = generatedText;
        document.getElementById('photoDescription').value = generatedText;

        btn.innerHTML = originalContent;
        lucide.createIcons();
        btn.disabled = false;
    });

    // Submit Form
    document.getElementById('uploadForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!newPhoto.file || !newPhoto.title) return;

        const newId = photos.length + 1;
        const photoEntry = {
            id: newId,
            category: newPhoto.category,
            title: newPhoto.title,
            description: newPhoto.description || 'Sin descripción.',
            date: new Date().toISOString().split('T')[0],
            url: previewUrl
        };

        photos.unshift(photoEntry);
        renderGallery();

        // Reset
        newPhoto = { title: '', description: '', category: 'pajaros', file: null };
        previewUrl = null;
        document.getElementById('uploadForm').reset();
        renderPreview();
        modal.classList.add('hidden');
    });

    // Chat Widget
    const chatWidget = document.getElementById('chatWidget');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const chatCloseBtn = document.getElementById('chatCloseBtn');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessagesContainer = document.getElementById('chatMessages');

    function toggleChat() {
        isChatOpen = !isChatOpen;
        if (isChatOpen) {
            chatWidget.classList.remove('hidden');
            chatToggleBtn.innerHTML = `<i data-lucide="x" class="w-6 h-6"></i>`;
        } else {
            chatWidget.classList.add('hidden');
            chatToggleBtn.innerHTML = `<i data-lucide="message-circle" class="w-6 h-6"></i> <span class="font-bold hidden md:inline ml-2">Pregúntale a Manuel</span>`;
        }
        lucide.createIcons();
        scrollToBottom();
    }

    chatToggleBtn.addEventListener('click', toggleChat);
    chatCloseBtn.addEventListener('click', () => {
        isChatOpen = false;
        chatWidget.classList.add('hidden');
        chatToggleBtn.innerHTML = `<i data-lucide="message-circle" class="w-6 h-6"></i> <span class="font-bold hidden md:inline ml-2">Pregúntale a Manuel</span>`;
        lucide.createIcons();
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message
        addMessage('user', text);
        chatInput.value = '';

        // Show loading
        const loadingId = addLoadingIndicator();
        scrollToBottom();

        const systemPrompt = `
        Eres Manuel Pereira, un fotógrafo aficionado chileno.
        Naciste en Paine el 29 de marzo de 1969.
        Trabajas en ALCHI y en tu tiempo libre amas la fotografía.
        Tus temas favoritos son: pájaros (ornitología local), fotografía macro (abejas, insectos, plantas) y fútbol (grabar a tu hijo).
        Responde de manera amable, humilde y apasionada, usando modismos chilenos suaves si corresponde.
        Mantén las respuestas breves (máximo 2-3 oraciones).
        `;

        const responseText = await callGemini(text, systemPrompt);

        // Remove loading and add bot message
        removeLoadingIndicator(loadingId);
        addMessage('bot', responseText);
    });

    renderChatMessages();
});

// --- HELPER FUNCTIONS ---

function updateActiveTabStyles() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === activeTab) {
            btn.className = 'tab-btn px-6 py-2 rounded-full text-sm font-medium transition-all bg-amber-600 text-white shadow-lg shadow-amber-900/50';
        } else {
            btn.className = 'tab-btn px-6 py-2 rounded-full text-sm font-medium transition-all bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800';
        }
    });
}

function renderGallery() {
    const galleryGrid = document.getElementById('galleryGrid');
    const filteredPhotos = activeTab === 'todos' ? photos : photos.filter(p => p.category === activeTab);

    if (filteredPhotos.length === 0) {
        galleryGrid.innerHTML = `
            <div class="col-span-full text-center py-20 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <p>No hay fotos en este álbum todavía.</p>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = filteredPhotos.map(photo => `
        <div class="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 fade-in">
            <div class="aspect-[4/3] overflow-hidden">
                <img src="${photo.url}" alt="${photo.title}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                <span class="text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">${photo.category}</span>
                <h3 class="text-white text-xl font-bold font-serif">${photo.title}</h3>
                ${photo.description ? `<p class="text-slate-300 text-xs mt-2 italic border-l-2 border-amber-500 pl-2">"${photo.description}"</p>` : ''}
                <p class="text-slate-500 text-xs mt-2">${photo.date}</p>
            </div>
        </div>
    `).join('');
}

function renderPreview() {
    const container = document.getElementById('previewContainer');
    if (previewUrl) {
        container.innerHTML = `<img src="${previewUrl}" alt="Preview" class="h-32 mx-auto object-cover rounded shadow-lg" />`;
    } else {
        container.innerHTML = `
            <div class="text-slate-400">
                <div class="mx-auto w-10 h-10 mb-2 text-slate-500 flex justify-center">
                    <i data-lucide="camera" class="w-10 h-10"></i>
                </div>
                <span class="text-sm">Clic para seleccionar archivo</span>
            </div>
        `;
        lucide.createIcons();
    }
}

function checkFormValidity() {
    const btn = document.getElementById('submitPhotoBtn');
    if (newPhoto.file && newPhoto.title) {
        btn.disabled = false;
        btn.className = 'w-full py-3 rounded-lg font-bold text-white transition-colors mt-4 bg-amber-600 hover:bg-amber-700';
    } else {
        btn.disabled = true;
        btn.className = 'w-full py-3 rounded-lg font-bold text-white transition-colors mt-4 bg-slate-700 cursor-not-allowed text-slate-400';
    }
}

function addMessage(sender, text) {
    chatMessages.push({ sender, text });
    renderChatMessages();
}

function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    container.innerHTML = chatMessages.map(msg => `
        <div class="flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-amber-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}">
                ${msg.text}
            </div>
        </div>
    `).join('');
    scrollToBottom();
}

function addLoadingIndicator() {
    const container = document.getElementById('chatMessages');
    const id = 'loading-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'flex justify-start';
    div.innerHTML = `
        <div class="bg-slate-700 p-3 rounded-lg rounded-bl-none flex space-x-1">
            <div class="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
            <div class="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
            <div class="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
        </div>
    `;
    container.appendChild(div);
    return id;
}

function removeLoadingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}
