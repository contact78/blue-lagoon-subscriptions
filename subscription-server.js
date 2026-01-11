const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration HubSpot (depuis variables d'environnement)
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID || '49024019';

// Payment Links Stripe
const PAYMENT_LINKS = {
    'spa-confort-100': 'https://buy.stripe.com/test_3cIdRa6Dygoh0d1bXI4ow00',
    'spa-confort-200': 'https://buy.stripe.com/test_bJe5kEbXS7RLaRF8Lw4ow01',
    'spa-confort-250': 'https://buy.stripe.com/test_5kQdRafa45JD2l99PA4ow02',
    'spa-confort-custom': 'https://buy.stripe.com/test_bJe4gAe60eg9bVJ4vg4ow03',
    'spa-revision-100': 'https://buy.stripe.com/test_5kQ9AU3rmb3XgbZ8Lw4ow04',
    'spa-revision-200': 'https://buy.stripe.com/test_6oUfZifa48VP5xl6Do4ow05',
    'spa-revision-250': 'https://buy.stripe.com/test_7sY9AUd1W0pj5xl8Lw4ow06',
    'spa-revision-custom': 'https://buy.stripe.com/test_aFadRae60eg96Bp1j44ow07',
    'mono-confort-100': 'https://buy.stripe.com/test_7sYeVebXS3Bv0d19PA4ow08',
    'mono-confort-200': 'https://buy.stripe.com/test_00wfZi3rmfkdaRFaTE4ow09',
    'mono-confort-250': 'https://buy.stripe.com/test_4gMbJ20fa9ZT4th6Do4ow0a',
    'mono-confort-custom': 'https://buy.stripe.com/test_bJeaEY4vq1tn4th9PA4ow0b',
    'mono-revision-100': 'https://buy.stripe.com/test_bJe5kE7HC2xr1h5gdY4ow0c',
    'mono-revision-200': 'https://buy.stripe.com/test_5kQbJ2bXS0pj6Bp5zk4ow0d',
    'mono-revision-250': 'https://buy.stripe.com/test_aFa9AU5zu6NH6Bp3rc4ow0e',
    'mono-revision-custom': 'https://buy.stripe.com/test_aFa6oI8LG7RL6Bp3rc4ow0f',
    'double-confort-100': 'https://buy.stripe.com/test_4gM3cwbXS4FzbVJ5zk4ow0g',
    'double-confort-200': 'https://buy.stripe.com/test_bJe4gAfa4eg9e3R1j44ow0h',
    'double-confort-250': 'https://buy.stripe.com/test_9B600k4vq8VP4th1j44ow0i',
    'double-confort-custom': 'https://buy.stripe.com/test_eVq3cwd1Wc81e3R1j44ow0j',
    'double-revision-100': 'https://buy.stripe.com/test_eVq00kaTO9ZTf7V4vg4ow0k',
    'double-revision-200': 'https://buy.stripe.com/test_dRm14o1je7RLe3R5zk4ow0l',
    'double-revision-250': 'https://buy.stripe.com/test_dRmaEY7HC6NH5xl8Lw4ow0m',
    'double-revision-custom': 'https://buy.stripe.com/test_8x214o9PKc816Bp9PA4ow0n'
};

// Fonction pour créer/mettre à jour un contact HubSpot
async function createHubSpotContact(formData) {
    try {
        const response = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts',
            {
                properties: {
                    firstname: formData.fullName.split(' ')[0],
                    lastname: formData.fullName.split(' ').slice(1).join(' '),
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    titulaire_du_compte: formData.accountHolder,
                    type_de_bassin: formData.type,
                    type_de_formule: formData.formule,
                    distance: formData.distance
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Contact créé dans HubSpot:', response.data.id);
        return true;
    } catch (error) {
        console.error('❌ Erreur HubSpot:', error.response?.data || error.message);
        // On continue même si HubSpot échoue
        return false;
    }
}

// Route pour soumettre l'abonnement
app.post('/api/subscribe', async (req, res) => {
    try {
        const { fullName, email, address, phone, accountHolder, type, formule, distance } = req.body;

        // Valider les données
        if (!fullName || !email || !address || !phone || !accountHolder) {
            return res.status(400).json({ error: 'Champs obligatoires manquants' });
        }

        // Créer le contact HubSpot
        await createHubSpotContact({
            fullName,
            email,
            address,
            phone,
            accountHolder,
            type,
            formule,
            distance
        });

        // Trouver le lien Stripe
        const paymentLinkKey = `${type}-${formule}-${distance}`;
        const paymentLink = PAYMENT_LINKS[paymentLinkKey];

        if (!paymentLink) {
            return res.status(400).json({ error: 'Lien de paiement non trouvé' });
        }

        // Ajouter les paramètres
        const params = new URLSearchParams({
            prefilled_email: email,
            client_reference_id: fullName
        });

        // Retourner l'URL de redirection
        res.json({
            success: true,
            redirectUrl: `${paymentLink}?${params.toString()}`
        });

    } catch (error) {
        console.error('Erreur serveur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});