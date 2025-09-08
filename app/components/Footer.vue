<template>
  <footer class="site-footer">
    <div class="footer-container">
      <div class="footer-grid">
        <!-- Contact Section -->
        <div class="footer-section">
          <h3 class="footer-title">Contact Us</h3>
          <div class="footer-content">
            <div class="contact-item">
              <v-icon size="small" class="contact-icon">mdi-phone</v-icon>
              <span>+1 (647) 563 7235</span>
            </div>
            <div class="contact-item">
              <v-icon size="small" class="contact-icon">mdi-email</v-icon>
              <span>abdul.ojulari@exprealty.com</span>
            </div>
            <img 
                src="/images/avatars/exp.png" 
                alt="Logo" class="logo-image" 
                width="100" 
            />
          </div>
        </div>

        <!-- Quick Links Section -->
        <div class="footer-section">
          <h3 class="footer-title">Quick Links</h3>
          <nav class="footer-nav">
            <ul class="footer-links">
              <li v-for="link in footerLinks" :key="link.title">
                <NuxtLink :to="link.to" class="footer-link">
                  {{ link.title }}
                </NuxtLink>
              </li>
            </ul>
          </nav>
        </div>

        <!-- Social Section -->
        <div class="footer-section">
          <h3 class="footer-title">Follow Us</h3>
          <div class="social-links">
            <a
              v-for="social in socialLinks"
              :key="social.icon"
              :href="social.link"
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
              :aria-label="social.name"
            >
              <v-icon>{{ social.icon }}</v-icon>
            </a>
          </div>
        </div>
      </div>

      <!-- Copyright Section -->
      <div class="footer-bottom">
        <div class="footer-divider"></div>
        <div class="copyright">
          <p class="text-body-2 text-grey mb-4">For listings in Canada, the trademarks REALTOR®, REALTORS®, and the REALTOR® logo are controlled by The Canadian Real Estate Association (CREA) and identify real estate professionals who are members of CREA. The trademarks MLS®, Multiple Listing Service® and the associated logos are owned by CREA and identify the quality of services provided by real estate professionals who are members of CREA. Used under license.</p>
          <p>
            © {{ new Date().getFullYear() }} HomesByAbdulOjulari | Real Estate Portal. All rights reserved. 
            Powered by Abdul Ojulari
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const footerLinks = [
  { title: 'About Us', to: '/about' },
  { title: 'Terms of Service', to: '/terms' },
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Contact Us', to: '/contact' }
]

const socialLinks = [
  { icon: 'mdi-facebook', link: 'https://facebook.com', name: 'Facebook' },
  { icon: 'mdi-twitter', link: 'https://twitter.com', name: 'Twitter' },
  { icon: 'mdi-instagram', link: 'https://instagram.com', name: 'Instagram' },
  { icon: 'mdi-linkedin', link: 'https://linkedin.com', name: 'LinkedIn' }
]
</script>

<style scoped>
.site-footer {
  background: white;
  border-top: 1px solid #e5e7eb;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 16px 24px;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px;
  margin-bottom: 32px;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.footer-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.footer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

.contact-icon {
  color: #9ca3af;
}

.footer-nav {
  margin: 0;
}

.footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-link {
  color: #6b7280;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;
  line-height: 1.5;
}

.footer-link:hover {
  color: #1976d2;
}

.social-links {
  display: flex;
  gap: 16px;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #f9fafb;
  border-radius: 50%;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.2s ease;
}

.social-link:hover {
  background: #1976d2;
  color: white;
  transform: translateY(-2px);
}

.footer-bottom {
  margin-top: 32px;
}

.footer-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 24px;
}

.copyright {
  text-align: center;
}

.copyright p {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.external-link {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
}

.external-link:hover {
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-container {
    padding: 32px 16px 20px;
  }
  
  .footer-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    margin-bottom: 24px;
  }
  
  .footer-title {
    font-size: 16px;
  }
  
  .social-links {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .footer-container {
    padding: 24px 12px 16px;
  }
  
  .footer-grid {
    gap: 24px;
  }
  
  .copyright p {
    font-size: 13px;
  }
}
</style>
