import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Moon, Sun } from 'lucide-react';
import './styles.css';
import img001 from './assets/img_001_0a06ca0618.png';
import img002 from './assets/img_002_1163d01d65.jpg';
import img003 from './assets/img_003_b1b141f1a7.jpg';
import img004 from './assets/img_004_151db10d47.jpg';
import img005 from './assets/img_005_22ab281e62.jpg';
import img006 from './assets/img_006_4671399bb9.jpg';
import img007 from './assets/img_007_f83c138091.jpg';
import img008 from './assets/img_008_db1cc88942.jpg';
import img009 from './assets/img_009_ca4356a31b.jpg';
import img010 from './assets/img_010_15bf83ba4b.jpg';
import img011 from './assets/img_011_d80d023229.jpg';
import img012 from './assets/img_012_cd4e143850.jpg';

// isDark/setIsDark: nhận từ App.jsx (state gốc đọc/ghi localStorage key 'ktx-dark-mode'),
// giống hệt cách Login.jsx nhận — để chọn chế độ tối ở trang giới thiệu, Đăng nhập hay
// trong hệ thống đều là CÙNG 1 trạng thái, không lệch nhau.
export default function ICTULandingPage({ onEnterSystem, isDark, setIsDark }) {
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef(null);
  const heroPhotoRef = useRef(null);
  const rootRef = useRef(null);

  const closeNav = () => setNavOpen(false);

  // Cuộn mượt tự viết bằng requestAnimationFrame — KHÔNG dùng scrollIntoView/scroll-behavior
  // native. Lý do: các API smooth-scroll native (CSS scroll-behavior, Element.scrollIntoView)
  // đều có thể bị chính trình duyệt (Chrome/Edge) ép về tức thời ở tầng hệ điều hành khi bật
  // "giảm chuyển động" — code truyền behavior:'smooth' vẫn bị ghi đè, không cách nào override từ
  // phía trang web. Tự animate bằng rAF thao tác thẳng window.scrollTo() từng frame thì trình
  // duyệt không có chỗ nào để can thiệp/ép instant được nữa — motion chạy độc lập hoàn toàn.
  const animateScrollTo = useCallback((targetY, duration = 700) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    if (Math.abs(diff) < 1) return;
    const startTime = performance.now();
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + diff * easeInOutCubic(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const scrollToHash = useCallback((hash, e) => {
    const id = hash.replace('#', '');
    const el = id ? document.getElementById(id) : null;
    if (!el) return; // href="#" trống (placeholder chân trang) — để trình duyệt tự xử lý
    e.preventDefault();
    const HEADER_OFFSET = 88; // khớp scroll-margin-top trong styles.css (72px header + đệm)
    const targetY = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    animateScrollTo(Math.max(targetY, 0));
    window.history.pushState(null, '', hash);
    closeNav();
  }, [animateScrollTo]);

  // styles.css chỉ định nghĩa biến --color-* trong :root và .dark; nếu chỉ gắn class "dark" lên
  // div gốc (rootRef) thì <body>/<html> (tổ tiên của div đó) KHÔNG kế thừa được biến đã override,
  // nên nền <body> luôn giữ màu sáng mặc định (lộ ra khi overscroll trên mobile hoặc trước khi
  // div gốc kịp render). Đồng bộ class "dark" lên <html> để toàn trang tối đúng như App.jsx
  // (nơi màu nền được set trực tiếp trên div ngoài cùng min-h-screen, không qua biến CSS kế thừa).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  useEffect(() => {
    // Theo yêu cầu: motion (scroll-reveal + hero parallax) chạy độc lập với prefers-reduced-motion,
    // luôn bật bất kể người dùng có bật "giảm chuyển động" hay không.
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('js-rv');

    const root = rootRef.current;
    const triggers = [];

    // ---- Scroll reveal: single elements ----
    root.querySelectorAll('.rv').forEach((el) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          onEnter: () => el.classList.add('in-view'),
          once: true,
        })
      );
    });

    // ---- Scroll reveal: staggered groups ----
    root
      .querySelectorAll('.feature-grid, .ai-grid, .role-grid, .marquee-wrap, .event-strip')
      .forEach((group) => {
        group.classList.add('rv-stagger');
        triggers.push(
          ScrollTrigger.create({
            trigger: group,
            start: 'top 85%',
            onEnter: () => group.classList.add('in-view'),
            once: true,
          })
        );
      });

    // ---- Draw-on underline trigger ----
    root.querySelectorAll('.draw-underline').forEach((el) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          onEnter: () => el.classList.add('in-view'),
          once: true,
        })
      );
    });

    // ---- Hero photo parallax ----
    let heroTween;
    if (heroPhotoRef.current) {
      heroTween = gsap.to(heroPhotoRef.current, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-poster',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }

    // Cleanup on unmount — avoid leaking ScrollTriggers across route/page changes
    return () => {
      triggers.forEach((t) => t.kill());
      if (heroTween && heroTween.scrollTrigger) heroTween.scrollTrigger.kill();
      if (heroTween) heroTween.kill();
    };
  }, []);

  return (
    <div ref={rootRef} className={isDark ? 'dark' : undefined}>

<a className="skip-link" href="#main" onClick={(e) => scrollToHash('#main', e)}>Bỏ qua để đến nội dung</a>
<header className="site">
<div className="wrap nav-row">
<a aria-label="Về trang chủ ICTU Dormitory Management System" className="brand-mark" href="#top" onClick={(e) => scrollToHash('#top', e)}>
<img alt="Logo Trường Đại học Công nghệ Thông tin và Truyền thông Thái Nguyên" src={img001}/>
<span className="name">ICTU Dormitory Management System<small>Ký túc xá thông minh</small></span>
</a>
<nav aria-label="Điều hướng chính" className={`primary${navOpen ? ' nav-open' : ''}`} ref={navRef}>
<a href="#gioi-thieu" onClick={(e) => scrollToHash('#gioi-thieu', e)}>Giới thiệu</a>
<a href="#tinh-nang" onClick={(e) => scrollToHash('#tinh-nang', e)}>Tính năng</a>
<a href="#ai" onClick={(e) => scrollToHash('#ai', e)}>AI đồng hành</a>
<a href="#vai-tro" onClick={(e) => scrollToHash('#vai-tro', e)}>Vai trò</a>
<a href="#khong-gian" onClick={(e) => scrollToHash('#khong-gian', e)}>Không gian sống</a>
</nav>
<div className="header-cta">
<button
  type="button"
  className="theme-toggle"
  onClick={() => setIsDark(!isDark)}
  aria-label="Chuyển chế độ sáng/tối"
>
  {isDark ? <Sun /> : <Moon />}
  <span className="theme-toggle-label">{isDark ? 'Sáng' : 'Tối'}</span>
</button>
<button type="button" className="btn btn-primary" onClick={onEnterSystem}>Vào hệ thống</button>
</div>
<button aria-expanded={navOpen} aria-label="Mở menu" className="nav-toggle" onClick={() => setNavOpen(o => !o)}><span></span></button>
</div>
</header>
<main id="main">
{/* ================= HERO (poster) ================= */}
<section className="hero-poster" id="top">
<div className="hero-poster-photo">
<img alt="Tòa nhà ký túc xá ICTU, ảnh chụp thực tế trong khuôn viên trường" src={img002} ref={heroPhotoRef}/>
</div>
<div className="wrap hero-poster-inner">
<h1 className="poster-h1" style={{marginTop: '20px'}}>QUẢN LÝ<br/>KÝ TÚC XÁ<br/><em>THÔNG MINH</em></h1>
<div className="poster-row">
<p className="poster-sub">Xếp phòng, hợp đồng, phí và phản ánh — Ban quản lý, kế toán và sinh viên nội trú cùng
            làm việc trên một hệ thống, có AI đồng hành.</p>
<button type="button" className="btn-poster" onClick={onEnterSystem}>Vào hệ thống <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
<path d="M5 12h14M13 6l6 6-6 6"></path>
</svg></button>
</div>
</div>
</section>
{/* ================= GIỚI THIỆU ================= */}
<section className="tinted" id="gioi-thieu">
<div className="wrap about-grid">
<div className="about-copy">
<span className="eyebrow">Về ICTU &amp; ký túc xá</span>
<h2 style={{fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem,3vw,2.1rem)', marginTop: '14px', marginBottom: '18px'}}>
            Một trường thành viên của Đại học Thái Nguyên, ngay tại Thái Nguyên.</h2>
<p><strong>Trường Đại học Công nghệ Thông tin và Truyền thông (ICTU)</strong> – một thành viên của Đại học Thái Nguyên – tọa lạc tại phường Quyết Thắng, thành phố Thái Nguyên. Trường được nâng cấp từ Khoa Công nghệ Thông tin và hiện là một trong những cơ sở đào tạo CNTT trọng điểm của khu vực</p>
<p>Trong khuôn viên trường, ký túc xá là nơi sinh viên học tập, nghỉ ngơi và kết nối – với các tòa nhà được chia tầng, phòng, cùng sân bóng, khu vực sinh hoạt chung. Nhưng trước kia, mọi công tác quản lý chỗ ở, theo dõi hợp đồng và lắng nghe ý kiến sinh viên đều phải làm bằng tay, mất thời gian và dễ sai sót. Hiểu được điều đó, chúng tôi xây dựng hệ thống quản lý ký túc xá thông minh – để biến những vướng mắc hằng ngày thành những thao tác đơn giản, nhanh gọn, giúp cuộc sống trong kí túc xá trở nên dễ dàng hơn bao giờ hết.</p>
<p><strong>Kí túc xá số ICTU</strong> ra đời để số hóa toàn bộ quy trình đó — đồng thời tích hợp AI để trả lời nội
            quy, gợi ý xếp phòng và tóm tắt phản ánh, giúp Ban quản lý ra quyết định nhanh hơn.</p>
<div className="fact-list">
<div className="fact"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg><span>Trực thuộc Đại học Thái Nguyên, đặt tại phường Quyết Thắng, tỉnh Thái Nguyên.</span></div>
<div className="fact"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg><span>Ký túc xá tổ chức theo nhiều tòa nhà, mỗi tòa gồm nhiều tầng và phòng.</span></div>
<div className="fact"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg><span>Hệ thống phân quyền rõ ràng cho sinh viên, ban quản lý KTX và kế toán.</span></div>
</div>
</div>
<div className="about-photos">
<img alt="Một tòa nhà ký túc xá ICTU với ban công từng phòng, ảnh chụp thực tế trong khuôn viên trường" className="tall" src={img002}/>
<img alt="Tòa nhà C5 trong khuôn viên trường ICTU" className="short" src={img003}/>
<img alt="Hành lang một tòa nhà trong khuôn viên ICTU" className="short" src={img004}/>
</div>
</div>
</section>
{/* ================= TÍNH NĂNG QUẢN LÝ ================= */}
<section id="tinh-nang">
<div className="wrap">
<div className="section-head">
<span className="eyebrow">Chức năng quản lý</span>
<h2>Mọi nghiệp vụ ký túc xá, trong một nơi làm việc.</h2>
<p>Từ hồ sơ sinh viên đến công nợ — mỗi vai trò chỉ thấy đúng phần việc của mình, không còn phải hỏi qua lại
            giữa các phòng ban.</p>
</div>
<div className="feature-grid">
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path>
</svg></div>
<h3>Đăng nhập &amp; phân quyền</h3>
<p>Ba vai trò riêng biệt — Ban quản lý KTX, sinh viên, kế toán — mỗi vai trò một giao diện phù hợp.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1"></path>
</svg></div>
<h3>Tòa · tầng · phòng · giường</h3>
<p>Quản lý cấu trúc ký túc xá theo từng cấp, tra cứu chỗ trống theo thời gian thực.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
</svg></div>
<h3>Hồ sơ sinh viên nội trú</h3>
<p>Lưu trữ đầy đủ thông tin từng sinh viên đang ở, gắn liền với phòng và hợp đồng hiện tại.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"></path>
</svg></div>
<h3>Đăng ký, xếp &amp; chuyển phòng</h3>
<p>Sinh viên đăng ký ở, xin chuyển hoặc trả phòng — Ban quản lý xét duyệt ngay trên hệ thống.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
</svg></div>
<h3>Phí phòng &amp; công nợ</h3>
<p>Theo dõi khoản thu theo từng sinh viên, kế toán nắm công nợ mà không cần đối chiếu sổ tay.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"></path>
</svg></div>
<h3>Phản ánh &amp; vi phạm nội quy</h3>
<p>Sinh viên gửi phản ánh sự cố, Ban quản lý theo dõi trạng thái xử lý từ đầu đến cuối.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M21 21 15 15M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"></path>
</svg></div>
<h3>Tra cứu chỗ trống &amp; lịch sử ở</h3>
<p>Xem nhanh phòng còn giường trống và toàn bộ lịch sử cư trú của một sinh viên.</p>
</div>
<div className="feature-card">
<div className="ic"><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M3 3v18h18M7 15l4-4 3 3 5-6"></path>
</svg></div>
<h3>Thống kê tổng quan</h3>
<p>Công suất phòng, công nợ và phản ánh gộp lại thành một bức tranh chung, dễ báo cáo.</p>
</div>
</div>
</div>
</section>
{/* ================= AI ================= */}
<section className="tinted" id="ai">
<div className="wrap">
<div className="ai-band">
<div className="ai-head">
<span className="eyebrow">AI đồng hành</span>
<h2>AI không thay thế Ban quản lý — nó rút ngắn việc lặp đi lặp lại.</h2>
<p>Ba việc AI đảm nhận trong hệ thống, dựa trên đúng dữ liệu và nội quy đang có — không tự đặt ra quy định
              mới.</p>
</div>
<div className="ai-grid">
<div className="ai-card">
<span className="num">01 · CHATBOT</span>
<h3>Hỏi đáp nội quy KTX</h3>
<p>Sinh viên và Ban quản lý hỏi trực tiếp về nội quy; AI trả lời ngắn gọn và dẫn lại đúng mục nội quy liên
                quan.</p>
</div>
<div className="ai-card">
<span className="num">02 · GỢI Ý</span>
<h3>Gợi ý xếp phòng</h3>
<p>Dựa trên chỗ trống thực tế và tiêu chí cơ bản, AI đề xuất phòng phù hợp thay vì phải dò thủ công từng
                tòa.</p>
</div>
<div className="ai-card">
<span className="num">03 · TÓM TẮT</span>
<h3>Tóm tắt phản ánh</h3>
<p>AI gom các phản ánh, sự cố theo nhóm vấn đề, giúp Ban quản lý nắm tình hình nhanh trước khi xử lý.</p>
</div>
</div>
</div>
</div>
</section>
{/* ================= VAI TRÒ ================= */}
<section id="vai-tro">
<div className="wrap">
<div className="section-head">
<span className="eyebrow">Ba vai trò</span>
<h2>Ai cũng có một nơi làm việc riêng, không lẫn vào nhau.</h2>
</div>
<div className="role-grid">
<div className="role-card">
<span className="tag">Sinh viên</span>
<h3>Chủ động với chỗ ở của mình</h3>
<ul>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Đăng ký ở, xin chuyển hoặc trả phòng</li>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Gửi và phản ánh, sự cố</li>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Hỏi AI về nội quy bất cứ lúc nào</li>
</ul>
</div>
<div className="role-card">
<span className="tag">Ban quản lý KTX</span>
<h3>Toàn cảnh vận hành ký túc xá</h3>
<ul>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Xét duyệt đăng ký ở, chuyển, trả phòng</li>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Xử lý phản ánh &amp; vi phạm nội quy</li>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Dùng AI gợi ý xếp phòng, tóm tắt phản ánh</li>
</ul>
</div>
<div className="role-card">
<span className="tag">Kế toán</span>
<h3>Theo sát phí &amp; công nợ</h3>
<ul>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Theo dõi phí phòng theo từng sinh viên</li>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Nắm công nợ mà không cần đối chiếu sổ sách</li>
<li><svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
<path d="M20 6 9 17l-5-5"></path>
</svg>Xem thống kê công suất phòng liên quan đến thu chi</li>
</ul>
</div>
</div>
</div>
</section>
{/* ================= KHÔNG GIAN SỐNG ================= */}
<section className="tinted" id="khong-gian">
<div className="wrap">
<div className="section-head">
<span className="eyebrow">Không gian sống</span>
<h2>Ảnh chụp bên trong khuôn viên ký túc xá.</h2>
<p>Một góc của khu nội trú và sân chơi trong trường.</p>
</div>
<div aria-label="Thư viện ảnh không gian và hoạt động tại ký túc xá, cuộn ngang liên tục" className="marquee-wrap" role="group">
<div className="marquee-track">
<figure className="mq-card"><img alt="Tòa nhà ký túc xá, ban công có quần áo phơi — sinh hoạt thường ngày của sinh viên nội trú" loading="lazy" src={img002}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Hành lang một tòa nhà trong khuôn viên trường, buổi sáng" loading="lazy" src={img004}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Sân bóng rổ trong khuôn viên trường lúc hoàng hôn" loading="lazy" src={img005}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Một tòa nhà hiện đại màu trắng trong khuôn viên trường" loading="lazy" src={img006}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Tòa nhà C5 nhìn từ dưới lên, nền trời xanh" loading="lazy" src={img003}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Toàn cảnh sân bóng rổ và các sân thể thao trong khuôn viên KTX" loading="lazy" src={img007}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Rổ bóng rổ nhìn qua hàng rào lưới và hoa giấy" loading="lazy" src={img008}/>
<figcaption></figcaption>
</figure>
<figure className="mq-card"><img alt="Cây xanh và bãi để xe cạnh dãy nhà ký túc xá" loading="lazy" src={img009}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img002}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img004}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img005}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img006}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img003}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img007}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img008}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img009}/>
<figcaption></figcaption>
</figure>
<figure aria-hidden="true" className="mq-card"><img alt="" loading="lazy" src={img010}/>
</figure>
</div>
</div>
</div>
</section>
{/* ================= KHÔNG GIAN & NHỊP SỐNG (split-story, theo bố cục ma.png) ================= */}
<section className="split-story">
<div className="wrap">
<div className="split-row">
<div className="split-media rv"><img alt="Tòa C5 trong khuôn viên ký túc xá, có biển định danh tòa nhà" loading="lazy" src={img011}/><span className="tag">Tòa
              C5</span></div>
<div className="split-copy rv">
<span className="eyebrow draw-underline">Định danh theo tòa<svg preserveAspectRatio="none" viewBox="0 0 200 14"><path d="M2 8c30-8 60-8 90 0s90 8 106-2"></path></svg></span>
<h3>Mỗi tòa một biển tên, mỗi phòng một mã số — ngoài đời đã rõ ràng, trên hệ thống càng phải khớp.</h3>
<p>Biển “C5” được gắn ở trên toà nhà là cách để sinh viên nhận biết được vị trí và toà mình đang ở một cách dễ dàng. KTX số ICTU
              giữ đúng cấu trúc <strong>tòa – tầng – phòng – giường</strong> này trong dữ liệu, để tra cứu chỗ trống hay
              xử lý phản ánh không bị lệch giữa sổ sách và thực tế.</p>
</div>
</div>
<div className="split-row reverse">
<div className="split-media rv"><img alt="Sân lát gạch trong khuôn viên KTX với hoa giấy và đồ phơi trên ban công" loading="lazy" src={img012}/><span className="tag">Sân trong khu nội trú</span></div>
<div className="split-copy rv">
<span className="eyebrow draw-underline">Sống thật – giải quyết thật<svg preserveAspectRatio="none" viewBox="0 0 200 14">
<path d="M2 8c30-8 60-8 90 0s90 8 106-2"></path>
</svg></span>
<h3>Nhịp sống thường nhật trong ký túc xá bắt đầu từ những chi tiết nhỏ nhất – và cũng từ đó, mọi phản ánh, sự cố đều được hệ thống ghi nhận, xử lý kịp thời.
            </h3>
<p>Từ sợi dây phơi trên ban công đến khóm hoa giấy trước sảnh – đó là những gì Ban quản lý chứng kiến mỗi ngày. Hệ thống của chúng tôi được xây dựng để phục vụ chính không gian thực này, không phải một khuôn viên tưởng tượng. Chúng tôi không chỉ quan sát, mà còn lắng nghe, phản hồi và chủ động giải quyết vấn đề, biến mỗi góc nhỏ trở thành một mắt xích trong chuỗi vận hành thông minh, tiện ích.</p>
</div>
</div>
</div>
</section>
{/* ================= CTA ================= */}
<section>
<div className="wrap">
<div className="cta-band">
<div>
<h2>Sẵn sàng chuyển sang ký túc xá bằng hệ thống số?</h2>
<p>Đăng nhập theo đúng vai trò của bạn — sinh viên, Ban quản lý, hoặc kế toán.</p>
</div>
<button type="button" className="btn btn-primary" onClick={onEnterSystem}>Vào hệ thống ngay</button>
</div>
</div>
</section>
</main>
<footer>
<div className="wrap">
<div className="footer-grid">
<div className="footer-brand">
<a className="brand-mark" href="#top" onClick={(e) => scrollToHash('#top', e)}>
<img alt="Logo ICTU" src={img001}/>
<span className="name">KTX Số ICTU<small>Ký túc xá thông minh</small></span>
</a>
<p>Hệ thống quản lý ký túc xá tích hợp AI của Trường Đại học Công nghệ Thông tin và Truyền thông Thái Nguyên
            (ICTU) — trực thuộc Đại học Thái Nguyên.</p>
</div>
<div className="footer-col">
<h4>Điều hướng</h4>
<ul>
<li><a href="#top" onClick={(e) => scrollToHash('#top', e)}>Trang chủ</a></li>
<li><a href="#gioi-thieu" onClick={(e) => scrollToHash('#gioi-thieu', e)}>Giới thiệu</a></li>
<li><a href="#tinh-nang" onClick={(e) => scrollToHash('#tinh-nang', e)}>Tính năng</a></li>
<li><a href="#ai" onClick={(e) => scrollToHash('#ai', e)}>AI đồng hành</a></li>
</ul>
</div>
<div className="footer-col">
<h4>Vai trò</h4>
<ul>
<li><a href="#vai-tro" onClick={(e) => scrollToHash('#vai-tro', e)}>Sinh viên</a></li>
<li><a href="#vai-tro" onClick={(e) => scrollToHash('#vai-tro', e)}>Ban quản lý KTX</a></li>
<li><a href="#vai-tro" onClick={(e) => scrollToHash('#vai-tro', e)}>Kế toán</a></li>
</ul>
</div>
<div className="footer-col">
<h4>Liên hệ</h4>
<ul>
<li><a href="#">Phòng Công tác Sinh viên</a></li>
<li><a href="#">Ban quản lý KTX</a></li>
</ul>
</div>
</div>
<div className="footer-bottom">
<span>© 2026 Trường Đại học Công nghệ Thông tin và Truyền thông Thái Nguyên (ICTU).</span>
<span>Đại học Thái Nguyên</span>
</div>
</div>
</footer>



    </div>
  );
}