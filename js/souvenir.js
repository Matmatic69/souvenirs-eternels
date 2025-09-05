import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Fonction pour formater les dates
function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

async function loadSouvenir() {
    const urlParams = new URLSearchParams(window.location.search);
    const souvenirId = urlParams.get('id');
    const container = document.querySelector('.souvenir-container');

    if (!souvenirId) {
        container.innerHTML = '<h1>Aucun souvenir trouvé.</h1><p>Veuillez vérifier que le lien est correct.</p>';
        return;
    }

    try {
        const docRef = doc(db, "souvenirs", souvenirId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Mettre à jour le titre de la page
            document.title = `En mémoire de ${data.name}`;

            // Remplir le header
            const header = document.querySelector('.souvenir-header');
            header.innerHTML = `
                <h1>${data.name}</h1>
                <p class="dates">${formatDate(data.birthdate)} - ${formatDate(data.deathdate)}</p>
            `;

            // Remplir la biographie
            document.getElementById('souvenir-message').innerText = data.message;

            // Remplir la vidéo
            if (data.videoURL) {
                const videoContainer = document.getElementById('souvenir-video');
                videoContainer.innerHTML = `
                    <h2>Vidéo souvenir</h2>
                    <video controls src="${data.videoURL}"></video>
                `;
            }

            // Remplir la galerie photo
            if (data.photoURLs && data.photoURLs.length > 0) {
                const galleryContainer = document.getElementById('souvenir-gallery');
                galleryContainer.innerHTML = '<h2>Galerie</h2>';
                data.photoURLs.forEach(url => {
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = `Souvenir de ${data.name}`;
                    img.addEventListener('click', () => openLightbox(url, `Souvenir de ${data.name}`));
                    galleryContainer.appendChild(img);
                });
            }

        } else {
            container.innerHTML = '<h1>Souvenir introuvable.</h1><p>Ce mémorial n\'existe pas ou a été supprimé.</p>';
        }
    } catch (error) {
        console.error("Erreur lors du chargement du souvenir: ", error);
        container.innerHTML = '<h1>Erreur</h1><p>Une erreur est survenue lors du chargement du souvenir.</p>';
    }
}

function openLightbox(src, alt) {
    const modal = document.getElementById('lightbox-modal');
    const modalImg = document.getElementById('lightbox-image');
    const captionText = document.getElementById('caption');

    modal.style.display = "block";
    modalImg.src = src;
    captionText.innerHTML = alt;
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.style.display = "none";
}

// Événements
window.onload = loadSouvenir;
document.querySelector('.close-button').addEventListener('click', closeLightbox);
document.getElementById('lightbox-modal').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-modal') { // Ferme si on clique sur le fond
        closeLightbox();
    }
});
