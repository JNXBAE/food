document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('siteFooter');
  if(!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">
            <img src="assets/logo.png" alt="Jungle Foods logo">
            <div>
              <strong style="font-family:var(--font-display);font-size:1.15rem;">Jungle Foods</strong><br>
              <small style="color:var(--mist);">Mandi · Biriyani · Multi-Cuisine</small>
            </div>
          </div>
          <p>A multi-cuisine restaurant serving Mandi, Biriyani, Chinese, Indian Breads, Shawarma, Beverages, Desserts &amp; more.</p>
          <div class="social-row">
            <a href="https://www.instagram.com/jungle_foods_" target="_blank" aria-label="Instagram">📷</a>
            <a href="https://wa.me/919600420706" target="_blank" aria-label="WhatsApp">💬</a>
            <a href="tel:+919600420706" aria-label="Call">📞</a>
          </div>
        </div>
        <div>
          <h5>Explore</h5>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="menu.html">Menu</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="gallery.html">Gallery</a></li>
            <li><a href="reviews.html">Reviews</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div>
          <h5>Popular</h5>
          <ul>
            <li><a href="menu.html#g-mandi">Chicken Mandi</a></li>
            <li><a href="menu.html#g-biriyani">Biriyani</a></li>
            <li><a href="menu.html#g-chinese-foods">Chinese Foods</a></li>
            <li><a href="menu.html#g-mojito">Mojitos</a></li>
            <li><a href="menu.html#g-falooda">Falooda</a></li>
          </ul>
        </div>
        <div>
          <h5>Visit Us</h5>
          <ul>
            <li>📍 Cuddalore–Chidambaram Highway,<br>Manjakuzhi, Tamil Nadu – 608501</li>
            <li>📞 <a href="tel:+919600420706">+91 96004 20706</a></li>
            <li>🕙 10:00 AM – 10:00 PM, Daily</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        © ${new Date().getFullYear()} Jungle Foods. All rights reserved. &nbsp;·&nbsp; <a href="admin-login.html">Admin</a>
      </div>
    </div>
  `;
});
