// BHI Cloud API Configuration
const API_BASE = 'https://berkshire-rag-kvif.onrender.com/api';

// DOM Elements
const heroSection = document.getElementById('hero');
const chatContainer = document.getElementById('chat-container');
const chatScroll = document.getElementById('chat-scroll');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const btnText = submitBtn.querySelector('.btn-text');

let isFirstMessage = true;

// Pre-fill prompt cards logic
function selectPrompt(card) {
    const question = card.querySelector('p').innerText.replace(/"/g, '');
    userInput.value = question;
    chatForm.dispatchEvent(new Event('submit'));
}

// Render message bubbles in chat
function appendMessage(sender, content, isHtml = false) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message', sender);
    
    if (isHtml) {
        messageBubble.innerHTML = content;
    } else {
        messageBubble.innerText = content;
    }
    
    chatScroll.appendChild(messageBubble);
    scrollToBottom();
    return messageBubble;
}

// Append a shimmering skeleton loader
function appendShimmer() {
    const shimmerBubble = document.createElement('div');
    shimmerBubble.classList.add('message', 'agent');
    shimmerBubble.id = 'active-shimmer';
    
    shimmerBubble.innerHTML = `
        <div class="shimmer-container">
            <div class="shimmer-line w-95"></div>
            <div class="shimmer-line w-80"></div>
            <div class="shimmer-line w-60"></div>
        </div>
    `;
    
    chatScroll.appendChild(shimmerBubble);
    scrollToBottom();
    return shimmerBubble;
}

// Scroll chat container to bottom
function scrollToBottom() {
    chatScroll.scrollTop = chatScroll.scrollHeight;
}

// Handle Form Submission
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const query = userInput.value.trim();
    if (!query) return;
    
    userInput.value = '';
    userInput.disabled = true;
    submitBtn.disabled = true;
    btnText.innerText = 'Querying...';

    // Transition Hero to Chat layout on first message
    if (isFirstMessage) {
        heroSection.classList.add('shrink');
        chatContainer.classList.remove('hidden');
        isFirstMessage = false;
        
        // Wait briefly for layout transition animation before scrolling
        await new Promise(r => setTimeout(r, 450));
    }

    // Render user message bubble
    appendMessage('user', query);

    // Render loading shimmer for agent
    const shimmerBubble = appendShimmer();

    // Start a watchdog timer to notify user if Render is waking up (cold start)
    let isColdStart = true;
    const coldStartTimer = setTimeout(() => {
        if (isColdStart) {
            appendMessage('agent', `
                <div style="color: hsl(38, 92%, 50%); display: flex; align-items: flex-start; gap: 0.8rem; font-size: 0.88rem; background: hsla(38, 92%, 50%, 0.08); border: 1px dashed hsla(38, 92%, 50%, 0.3); padding: 0.8rem 1rem; border-radius: 12px;">
                    <i class="fa-solid fa-hourglass-start" style="margin-top: 0.2rem; font-size: 1.1rem; animation: spin 2.5s linear infinite;"></i>
                    <div>
                        <strong>Notice: Render Node Booting</strong><br>
                        Since this API is hosted on Render's free tier, the container shuts down after inactivity. Waking it up can take 40-50 seconds. Thank you for your patience...
                    </div>
                </div>
            `, true);
        }
    }, 9000);

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: query })
        });

        isColdStart = false;
        clearTimeout(coldStartTimer);
        
        // Delete shimmer loading bubble
        shimmerBubble.remove();

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const payload = await response.json();
        
        if (payload.success && payload.data && payload.data.answer) {
            // Render successfully generated agent response
            appendMessage('agent', payload.data.answer);
        } else {
            throw new Error(payload.message || 'Malformed JSON response from server');
        }

    } catch (error) {
        isColdStart = false;
        clearTimeout(coldStartTimer);
        shimmerBubble.remove();
        
        console.error('API Error:', error);
        
        appendMessage('agent', `
            <div style="color: hsl(0, 85%, 60%); display: flex; align-items: flex-start; gap: 0.8rem; font-size: 0.88rem; background: hsla(0, 85%, 60%, 0.08); border: 1px dashed hsla(0, 85%, 60%, 0.3); padding: 0.8rem 1rem; border-radius: 12px;">
                <i class="fa-solid fa-circle-exclamation" style="margin-top: 0.2rem; font-size: 1.1rem;"></i>
                <div>
                    <strong>Connection Failed</strong><br>
                    Could not query the Berkshire Intelligence node. Please verify that the Render backend is live and database is connected. Details: ${error.message}
                </div>
            </div>
        `, true);
    } finally {
        userInput.disabled = false;
        submitBtn.disabled = false;
        btnText.innerText = 'Query BHI';
        userInput.focus();
        scrollToBottom();
    }
});

// Style helper for loading spin animation
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}`;
document.head.appendChild(styleSheet);
