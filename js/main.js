// Основная интерактивность сайта Дивенской библиотеки
(function () {
    'use strict';

    // Навигация (мобильное меню)
    var navToggle = document.getElementById('navToggle');
    var mainNav = document.getElementById('mainNav');
    if (navToggle && mainNav) {
        navToggle.addEventListener('click', function () {
            var expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', String(!expanded));
            mainNav.classList.toggle('open');
        });

        // Закрыть меню по Escape
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && mainNav.classList.contains('open')) {
                mainNav.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // --- Каталог: загрузка, рендер и поиск (все элементы, но контейнер будет прокручиваться) ---
    var books = [];
    var filtered = null; // если применён поиск — массив результатов

    var booksGrid = document.getElementById('booksGrid');
    var catalogNote = document.getElementById('catalogNote');
    var searchInput = document.getElementById('search');

    function createCard(book) {
        var article = document.createElement('article');
        article.className = 'book-card';
        article.setAttribute('data-title', book.title || '');
        article.setAttribute('data-author', book.author || '');

        var h3 = document.createElement('h3');
        h3.textContent = book.title || 'Без названия';
        var pAuthor = document.createElement('p');
        pAuthor.className = 'author';
        pAuthor.textContent = book.author || '';
        var pDesc = document.createElement('p');
        pDesc.className = 'desc';
        pDesc.textContent = book.desc || '';

        article.appendChild(h3);
        article.appendChild(pAuthor);
        article.appendChild(pDesc);
        return article;
    }

    function renderAll(source) {
        if (!booksGrid) return;
        var src = source || books;
        booksGrid.innerHTML = '';
        var fragment = document.createDocumentFragment();
        for (var i = 0; i < src.length; i++) {
            fragment.appendChild(createCard(src[i]));
        }
        booksGrid.appendChild(fragment);
    }

    function resetAndRenderList(newFiltered) {
        filtered = newFiltered || null;
        renderAll(filtered || books);
    }

    function fetchBooks() {
        var url = '../data/books.json';
        fetch(url).then(function (res) {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        }).then(function (data) {
            if (!Array.isArray(data)) data = [];
            books = data;
            resetAndRenderList(null);
        }).catch(function (err) {
            if (catalogNote) catalogNote.textContent = 'Не удалось загрузить каталог.';
            console.error('Books load error', err);
        });
    }

    // Поиск с дебаунсом
    function debounce(fn, wait) {
        var t = null;
        return function () {
            var args = arguments;
            clearTimeout(t);
            t = setTimeout(function () {
                fn.apply(null, args);
            }, wait);
        };
    }

    function handleSearch() {
        if (!searchInput) return;
        var q = searchInput.value.trim().toLowerCase();
        if (q === '') {
            resetAndRenderList(null);
            return;
        }
        var results = books.filter(function (b) {
            var title = (b.title || '').toString().toLowerCase();
            var author = (b.author || '').toString().toLowerCase();
            return title.indexOf(q) !== -1 || author.indexOf(q) !== -1;
        });
        resetAndRenderList(results);
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 200));
    }

    // Инициируем загрузку каталога
    fetchBooks();

    // Set CSS variable --header-offset to current header height so anchors don't get hidden under sticky header
    var headerEl = document.querySelector('.site-header');

    function updateHeaderOffset() {
        if (headerEl) {
            var h = headerEl.offsetHeight || 0;
            document.documentElement.style.setProperty('--header-offset', h + 'px');
        }
    }

    // initial
    updateHeaderOffset();
    // update on resize (debounced)
    window.addEventListener('resize', debounce(updateHeaderOffset, 120));

    // --- Загрузка и рендер сотрудников ---
    (function () {
        var staff = [];
        var staffGrid = document.getElementById('staffGrid');
        // staff modal elements
        var staffModal = document.getElementById('staffModal');
        var staffModalClose = staffModal && staffModal.querySelector('.staff-modal-close');
        var staffModalAvatar = document.getElementById('staffModalAvatar');
        var staffModalName = document.getElementById('staffModalName');
        var staffModalRole = document.getElementById('staffModalRole');
        var staffModalContacts = document.getElementById('staffModalContacts');
        var staffModalBio = document.getElementById('staffModalBio');
        var _staffPrevFocus = null;

        function initials(name) {
            if (!name) return '';
            var parts = name.trim().split(/\s+/);
            return (parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '');
        }

        function createStaffCard(emp) {
            var card = document.createElement('div');
            card.className = 'staff-card';
            // Keep staff card as a simple, non-interactive element so clicks won't open a modal.
            // (Removed tabindex/role/aria-label and click/keydown handlers per user request.)

            var avatar = document.createElement('div');
            avatar.className = 'staff-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            // if a photo path is provided, show the image; otherwise show initials
            if (emp.photo) {
                try {
                    var img = document.createElement('img');
                    img.src = emp.photo;
                    img.alt = emp.name ? (emp.name + ' — фото') : 'Фото сотрудника';
                    img.loading = 'lazy';
                    avatar.appendChild(img);
                } catch (e) {
                    avatar.textContent = initials(emp.name).toUpperCase();
                }
            } else {
                avatar.textContent = initials(emp.name).toUpperCase();
            }

            var info = document.createElement('div');
            info.className = 'staff-info';

            var h3 = document.createElement('h3');
            h3.textContent = emp.name || 'Без имени';
            var role = document.createElement('span');
            role.className = 'role';
            role.textContent = emp.role || '';
            var contact = document.createElement('div');
            contact.className = 'contact';

            // Helper to create a contact row with icon and link
            function makeContactRow(href, text, icon, label) {
                var row = document.createElement('div');
                row.className = 'contact-item';
                var a = document.createElement('a');
                a.className = 'contact-link';
                a.href = href;
                // Accessibility: describe the action
                if (label) a.setAttribute('aria-label', label + ': ' + text);
                var iconEl = document.createElement('span');
                iconEl.className = 'contact-icon';
                iconEl.setAttribute('aria-hidden', 'true');
                // use consistent inline SVGs (same as footer)
                try {
                    var svg;
                    if (icon === 'email') {
                        svg = '<svg width="20" height="14" viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg">' +
                            '<path fill="currentColor" d="M0 2v10h20V2H0zm18 2.2l-8 4.8-8-4.8V3.2L10 8l8-4.8v1.2z"/></svg>';
                    } else if (icon === 'phone') {
                        svg = '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                            '<path fill="currentColor" d="M6.62 10.79a15.464 15.464 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.72 11.72 0 003.64.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h2.5a1 1 0 011 1 11.72 11.72 0 00.58 3.64 1 1 0 01-.24 1.02l-2.2 2.2z"/></svg>';
                    } else {
                        svg = '<span>' + (icon || '') + '</span>';
                    }
                    iconEl.innerHTML = svg;
                } catch (e) {
                    iconEl.textContent = icon;
                }
                var textEl = document.createElement('span');
                textEl.className = 'contact-text';
                textEl.textContent = text;
                a.appendChild(iconEl);
                a.appendChild(textEl);
                // prevent clicks on contact links from opening the parent staff card's modal
                a.addEventListener('click', function (e) {
                    e.stopPropagation();
                });
                row.appendChild(a);
                return row;
            }

            if (emp.email) {
                contact.appendChild(makeContactRow('mailto:' + emp.email, emp.email, 'email', 'Email'));
            }
            if (emp.phone) {
                // sanitize phone for tel: href (keep digits and leading +)
                var rawPhone = (emp.phone || '').toString();
                var phoneHref = 'tel:' + rawPhone.replace(/[^\d+]+/g, '');
                // Use simpler phone icon '☎' for a cleaner look
                contact.appendChild(makeContactRow(phoneHref, rawPhone, 'phone', 'Телефон'));
            }

            var bio = document.createElement('div');
            bio.className = 'bio';
            bio.textContent = emp.bio || '';

            info.appendChild(h3);
            info.appendChild(role);
            info.appendChild(contact);
            info.appendChild(bio);

            card.appendChild(avatar);
            card.appendChild(info);

            // Interaction removed: clicking or pressing keys on the staff card no longer opens the modal.
            // If you want an explicit "Подробнее" button later, we can add a small button inside the card that
            // calls openStaffModal(emp) so contact links keep working without the whole card acting as a button.
            return card;
        }

        function renderStaff(list) {
            if (!staffGrid) return;
            staffGrid.innerHTML = '';
            var frag = document.createDocumentFragment();
            list.forEach(function (emp) {
                frag.appendChild(createStaffCard(emp));
            });
            staffGrid.appendChild(frag);
        }

        // Staff modal helpers
        function openStaffModal(emp) {
            if (!staffModal) return;
            // avatar: show photo if available, otherwise initials
            try {
                if (staffModalAvatar) {
                    staffModalAvatar.innerHTML = '';
                    if (emp.photo) {
                        var im = document.createElement('img');
                        im.src = emp.photo;
                        im.alt = emp.name ? (emp.name + ' — фото') : 'Фото сотрудника';
                        im.loading = 'lazy';
                        staffModalAvatar.appendChild(im);
                    } else {
                        staffModalAvatar.textContent = initials(emp.name).toUpperCase();
                    }
                }
            } catch (e) {
            }
            if (staffModalName) staffModalName.textContent = emp.name || '';
            if (staffModalRole) staffModalRole.textContent = emp.role || '';
            if (staffModalContacts) {
                staffModalContacts.innerHTML = '';
                if (emp.email) {
                    var ea = document.createElement('a');
                    ea.href = 'mailto:' + emp.email;
                    ea.className = 'contact-link';
                    ea.setAttribute('aria-label', 'Email: ' + emp.email);
                    var eIcon = document.createElement('span');
                    eIcon.className = 'contact-icon';
                    eIcon.setAttribute('aria-hidden', 'true');
                    eIcon.innerHTML = '<svg width="20" height="14" viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M0 2v10h20V2H0zm18 2.2l-8 4.8-8-4.8V3.2L10 8l8-4.8v1.2z"/></svg>';
                    var eText = document.createElement('span');
                    eText.className = 'contact-text';
                    eText.textContent = emp.email;
                    ea.appendChild(eIcon);
                    ea.appendChild(eText);
                    staffModalContacts.appendChild(ea);
                }
                if (emp.phone) {
                    if (staffModalContacts.firstChild) staffModalContacts.appendChild(document.createTextNode(' '));
                    var pa = document.createElement('a');
                    pa.href = 'tel:' + (emp.phone || '').replace(/[^\d+]+/g, '');
                    pa.className = 'contact-link';
                    pa.setAttribute('aria-label', 'Телефон: ' + emp.phone);
                    var pIcon = document.createElement('span');
                    pIcon.className = 'contact-icon';
                    pIcon.setAttribute('aria-hidden', 'true');
                    pIcon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M6.62 10.79a15.464 15.464 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.72 11.72 0 003.64.58 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h2.5a1 1 0 011 1 11.72 11.72 0 00.58 3.64 1 1 0 01-.24 1.02l-2.2 2.2z"/></svg>';
                    var pText = document.createElement('span');
                    pText.className = 'contact-text';
                    pText.textContent = emp.phone;
                    pa.appendChild(pIcon);
                    pa.appendChild(pText);
                    staffModalContacts.appendChild(pa);
                }
            }
            if (staffModalBio) staffModalBio.textContent = emp.bio || '';

            // focus management: save and restore focus
            _staffPrevFocus = document.activeElement;
            staffModal.classList.add('open');
            staffModal.setAttribute('aria-hidden', 'false');
            setTimeout(function () {
                staffModalClose && staffModalClose.focus();
            }, 60);
            document.body.style.overflow = 'hidden';
        }

        function closeStaffModal() {
            if (!staffModal) return;
            staffModal.classList.remove('open');
            staffModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            // restore focus to the previously focused element
            if (_staffPrevFocus) {
                try {
                    _staffPrevFocus.focus();
                } catch (e) {
                }
                _staffPrevFocus = null;
            }
        }

        // wire modal close handlers
        if (staffModalClose) staffModalClose.addEventListener('click', closeStaffModal);
        if (staffModal) {
            staffModal.addEventListener('click', function (e) {
                if (e.target === staffModal) closeStaffModal();
            });
        }
        // close with Escape
        document.addEventListener('keydown', function (e) {
            if (!staffModal) return;
            if (staffModal.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') closeStaffModal();
        });

        function fetchEmployees() {
            var url = '../data/employees.json';
            fetch(url).then(function (res) {
                if (!res.ok) throw new Error('Employees load failed');
                return res.json();
            }).then(function (data) {
                if (!Array.isArray(data)) data = [];
                staff = data;
                renderStaff(staff);
            }).catch(function (err) {
                console.error('Employees load error', err);
                if (staffGrid) staffGrid.innerHTML = '<p style="color:var(--muted)">Не удалось загрузить список сотрудников.</p>';
            });
        }

        // Запускаем загрузку сотрудников
        fetchEmployees();
    })();

    // --- Мобильное меню: автозакрытие при клике (убрана логика ScrollSpy/подсветки) ---
    (function () {
        var navLinks = Array.prototype.slice.call(document.querySelectorAll('#mainNav a[href^="#"]'));
        var navEl = mainNav;
        var toggleEl = navToggle;

        // Закрывать мобильное меню при клике на ссылку (если меню открыто)
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                if (navEl && navEl.classList.contains('open')) {
                    navEl.classList.remove('open');
                    if (toggleEl) toggleEl.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Примечание: логика подсветки активного пункта при прокрутке (ScrollSpy)
        // удалена по запросу — теперь пункты меню не подсвечиваются при скролле.
    })();

    // --- Collapsible About section (toggle show/hide with accessible aria updates) ---
    (function () {
        var btn = document.getElementById('aboutToggle');
        var content = document.getElementById('aboutContent');
        if (!btn || !content) return;

        var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var labelEl = btn.querySelector('.toggle-label');

        function setLabelExpanded(expanded) {
            try {
                if (labelEl) {
                    labelEl.textContent = expanded ? 'Свернуть' : 'Подробнее';
                }
            } catch (e) {
            }
            btn.setAttribute('aria-label', (expanded ? 'Свернуть раздел О библиотеке' : 'Показать раздел О библиотеке'));
        }

        function expand() {
            btn.setAttribute('aria-expanded', 'true');
            content.classList.remove('collapsed');
            content.setAttribute('aria-hidden', 'false');
            setLabelExpanded(true);
            if (prefersReduced) {
                content.style.maxHeight = 'none';
                return;
            }
            // set explicit max-height to allow transition
            var h = content.scrollHeight;
            content.style.maxHeight = h + 'px';
            // after transition, remove max-height so content can size naturally if its internal layout changes
            setTimeout(function () {
                content.style.maxHeight = '';
            }, 320);
        }

        function collapse() {
            btn.setAttribute('aria-expanded', 'false');
            setLabelExpanded(false);
            // for animation: set current height then set to 0
            if (prefersReduced) {
                content.classList.add('collapsed');
                content.setAttribute('aria-hidden', 'true');
                content.style.maxHeight = '0';
                return;
            }
            var h = content.scrollHeight;
            content.style.maxHeight = h + 'px';
            // force frame then collapse
            requestAnimationFrame(function () {
                content.classList.add('collapsed');
                content.setAttribute('aria-hidden', 'true');
                content.style.maxHeight = '0';
            });
        }

        // initialize state based on markup (class collapsed / aria-hidden)
        if (content.classList.contains('collapsed') || content.getAttribute('aria-hidden') === 'true') {
            // ensure collapsed styles applied
            content.classList.add('collapsed');
            content.setAttribute('aria-hidden', 'true');
            btn.setAttribute('aria-expanded', 'false');
            content.style.maxHeight = '0';
            setLabelExpanded(false);
        } else {
            // expanded
            btn.setAttribute('aria-expanded', 'true');
            content.setAttribute('aria-hidden', 'false');
            content.style.maxHeight = '';
            setLabelExpanded(true);
        }

        btn.addEventListener('click', function () {
            var isCollapsed = content.classList.contains('collapsed');
            if (isCollapsed) expand(); else collapse();
        });
    })();

    // --- Обработка формы контактов (локально, без сервера) ---
    var contactForm = document.getElementById('contactForm');
    var formMessage = document.getElementById('formMessage');
    if (contactForm && formMessage) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var data = new FormData(contactForm);
            var name = (data.get('name') || '').toString().trim();
            var email = (data.get('email') || '').toString().trim();
            var message = (data.get('message') || '').toString().trim();

            // Простая валидация
            if (!name || !email || !message) {
                formMessage.style.color = 'red';
                formMessage.textContent = 'Пожалуйста, заполните все поля.';
                return;
            }
            // Имитация отправки
            formMessage.style.color = 'green';
            formMessage.textContent = 'Спасибо! Ваше сообщение отправлено.';
            contactForm.reset();
            setTimeout(function () {
                formMessage.textContent = '';
            }, 4000);
        });
    }

    // --- Инициализация карты OpenStreetMap (маркер и атрибуция) ---
    try {
        var mapEl = document.getElementById('map');
        if (mapEl && window.L) {
            var lat = 59.203888, lon = 30.009027, zoom = 15;

            // Create the map with scroll/touch/double-click zoom enabled.
            // We'll compute maxBounds dynamically so the library marker always stays inside the visible area.
            var map = L.map('map', {
                scrollWheelZoom: true,
                touchZoom: true,
                doubleClickZoom: true,
                attributionControl: false,
                minZoom: 10,
                maxZoom: 19
            }).setView([lat + 0.003, lon], zoom);
            // Optional: keep a reference for debugging in the console
            try {
                window._osmMap = map;
            } catch (e) {
            }

            L.control.attribution({prefix: false}).addTo(map);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                minZoom: 10,
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            var marker = L.marker([lat, lon]).addTo(map);

            // Popup with an image of the library. Uses the local images/house.jpg file.
            var popupHtml = '<div class="osm-popup" style="max-width:260px;text-align:center;font-size:0.95rem;line-height:1.25;">' +
                '<img src="/images/house.jpg" alt="Дивенская библиотека" loading="lazy" ' +
                'style="width:100%;height:auto;border-radius:6px;margin-bottom:8px;display:block;"/>' +
                '<strong>Дивенская библиотека</strong><br>ул. Володарского, 34А' +
                '</div>';

            marker.bindPopup(popupHtml, {maxWidth: 260, offset: L.point(0, 0), autoPan: false}).openPopup();
            var osmLink = document.getElementById('osmLink');
            if (osmLink) {
                osmLink.href = 'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=' + zoom + '/' + lat + '/' + lon;
            }
        }
    } catch (err) {
        // Если библиотека карт не загр��зилась — ничего не делаем
    }

    // --- Фотогалерея: загрузка, рендер, поиск и модальное просмотрщик ---
    (function () {
        var photos = [];
        var photosGrid = document.getElementById('photosGrid');
        var galleryNote = document.getElementById('galleryNote');

        // Helper: generate a poster image (data URL) by seeking a random frame from a video.
        // Accepts a photo item `p` (with p.src) and optional img element to update immediately.
        // Returns a Promise that resolves with the dataURL or rejects on error/timeout.
        function generateVideoPoster(p, imgEl) {
            return new Promise(function (resolve, reject) {
                try {
                    if (!p || !p.src) return reject(new Error('No video src'));
                    // If already generated, resolve immediately
                    if (p.thumb) {
                        if (imgEl) {
                            try {
                                imgEl.dataset.src = p.thumb;
                                imgEl.src = p.thumb;
                            } catch (e) {
                            }
                        }
                        return resolve(p.thumb);
                    }

                    var video = document.createElement('video');
                    video.muted = true;
                    video.preload = 'auto';
                    // try to allow drawing cross-origin videos if applicable
                    try {
                        video.crossOrigin = 'anonymous';
                    } catch (e) {
                    }
                    var timeout = null;
                    var cleaned = false;

                    function cleanup() {
                        if (cleaned) return;
                        cleaned = true;
                        video.removeAttribute('src');
                        try {
                            video.load();
                        } catch (e) {
                        }
                        video.src = '';
                        if (timeout) clearTimeout(timeout);
                        video.removeEventListener('loadedmetadata', onMeta);
                        video.removeEventListener('seeked', onSeeked);
                        video.removeEventListener('error', onError);
                    }

                    function onError(e) {
                        cleanup();
                        reject(e || new Error('Video load error'));
                    }

                    function onMeta() {
                        // choose a random time not too close to the very end
                        var duration = isFinite(video.duration) ? video.duration : 0;
                        var maxSeek = Math.max(duration - 0.2, 0);
                        var t = maxSeek > 0 ? (Math.random() * maxSeek) : 0;
                        // round to 3 decimal places to help some browsers
                        video.currentTime = Math.floor(t * 1000) / 1000;
                    }

                    function onSeeked() {
                        try {
                            var w = video.videoWidth || 640;
                            var h = video.videoHeight || 360;
                            var canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            var ctx = canvas.getContext('2d');
                            ctx.drawImage(video, 0, 0, w, h);
                            // use JPEG for smaller size; fall back to PNG if toDataURL unsupported
                            var dataURL = '';
                            try {
                                dataURL = canvas.toDataURL('image/jpeg', 0.8);
                            } catch (e) {
                                try {
                                    dataURL = canvas.toDataURL();
                                } catch (e) {
                                }
                            }
                            if (dataURL) {
                                p.thumb = dataURL;
                                if (imgEl) {
                                    try {
                                        imgEl.dataset.src = dataURL;
                                        imgEl.src = dataURL;
                                    } catch (e) {
                                    }
                                }
                                cleanup();
                                return resolve(dataURL);
                            } else {
                                cleanup();
                                return reject(new Error('Failed to create poster dataURL'));
                            }
                        } catch (err) {
                            cleanup();
                            reject(err);
                        }
                    }

                    // safety timeout in case events never fire
                    timeout = setTimeout(function () {
                        cleanup();
                        reject(new Error('Poster generation timed out'));
                    }, 6000);

                    video.addEventListener('loadedmetadata', onMeta, {once: true});
                    video.addEventListener('seeked', onSeeked, {once: true});
                    video.addEventListener('error', onError, {once: true});

                    // start loading
                    video.src = p.src;
                    // some browsers may need load() to start network activity
                    try {
                        video.load();
                    } catch (e) {
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }

        var modal = document.getElementById('photoModal');
        var modalImage = document.getElementById('modalImage');
        var modalVideo = document.getElementById('modalVideo');
        var modalCaption = document.getElementById('modalCaption');
        var btnClose = modal && modal.querySelector('.modal-close');
        var btnPrev = modal && modal.querySelector('.modal-prev');
        var btnNext = modal && modal.querySelector('.modal-next');

        var currentIndex = -1;

        function createPhotoCard(p, idx) {
            var a = document.createElement('button');
            a.className = 'photo-card';
            a.setAttribute('aria-label', (p.caption || (p.type === 'video' ? 'Видео' : 'Фото')) + ' — открыть');
            a.setAttribute('data-index', idx);
            a.type = 'button';

            var img = document.createElement('img');
            // use caption as the primary alt text (fallback to alt if caption is missing)
            img.alt = p.caption || p.alt || '';
            // Use image `src` for thumbnails for image items; for video items keep using `thumb` (still an image)
            if (p.type === 'video') {
                if (p.thumb) {
                    img.dataset.src = p.thumb;
                } else {
                    // fallback: inline SVG placeholder with play icon (data URI) to avoid using the video file as an <img>
                    try {
                        var titleText = (p.caption || 'Видео').toString().replace(/"/g, '\\"');
                        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">' +
                            '<rect width="100%" height="100%" fill="#e9e9e9"/>' +
                            '<text x="50%" y="46%" font-family="Roboto,Arial,sans-serif" font-size="28" text-anchor="middle" fill="#6b6b6b">' + titleText + '</text>' +
                            '</svg>';
                        img.dataset.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
                    } catch (e) {
                        img.dataset.src = p.src || '';
                    }
                }
            } else {
                img.dataset.src = p.src || p.thumb || '';
            }
            img.loading = 'lazy';
            img.src = img.dataset.src;

            // If this is a video without a provided thumb, generate a random-frame poster asynchronously
            if (p.type === 'video' && !p.thumb) {
                // attempt to generate and update the thumbnail when ready; failures are silent
                generateVideoPoster(p, img).catch(function () { /* ignore poster generation failures */
                });
            }

            var cap = document.createElement('div');
            cap.className = 'photo-caption';
            cap.textContent = p.caption || '';

            a.appendChild(img);

            // If item is a video, add a play badge overlay
            if (p.type === 'video') {
                // Always add a visual play-badge overlay for videos
                var badge = document.createElement('span');
                badge.className = 'play-badge';
                // accessible label inside badge not necessary; visual cue only
                badge.setAttribute('aria-hidden', 'true');
                a.appendChild(badge);
                // adjust aria-label to indicate video regardless
                a.setAttribute('aria-label', (p.caption || 'Видео') + ' — открыть видео');
            }

            a.appendChild(cap);

            // open modal on click
            a.addEventListener('click', function () {
                openModal(idx);
            });
            // keyboard support (Enter/Space)
            a.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openModal(idx);
                }
            });

            return a;
        }

        function renderGallery(list) {
            if (!photosGrid) return;
            photosGrid.innerHTML = '';
            var frag = document.createDocumentFragment();
            list.forEach(function (p, i) {
                frag.appendChild(createPhotoCard(p, i));
            });
            photosGrid.appendChild(frag);
            // The gallery should not show any caption text — hide the note element entirely.
            if (galleryNote) {
                galleryNote.textContent = '';
                galleryNote.style.display = 'none';
            }
            // init lazy-loading observers
            initLazyLoad();
        }

        function fetchPhotos() {
            var url = '../data/photos.json';
            fetch(url).then(function (res) {
                if (!res.ok) throw new Error('Photos load failed');
                return res.json();
            }).then(function (data) {
                if (!Array.isArray(data)) data = [];
                photos = data;
                renderGallery(photos);
            }).catch(function (err) {
                console.error('Photos load error', err);
                // Do not display any caption in the gallery area per design decision.
                if (galleryNote) {
                    galleryNote.textContent = '';
                    galleryNote.style.display = 'none';
                }
            });
        }

        // Simple lazy loader using IntersectionObserver (loads img.dataset.src -> src)
        var lazyObserver = null;

        function initLazyLoad() {
            var imgs = Array.prototype.slice.call(document.querySelectorAll('.photos-grid img'));
            if ('IntersectionObserver' in window) {
                if (lazyObserver) lazyObserver.disconnect();
                lazyObserver = new IntersectionObserver(function (entries, obs) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            var img = entry.target;
                            if (img.dataset && img.dataset.src) {
                                img.src = img.dataset.src;
                            }
                            obs.unobserve(img);
                        }
                    });
                }, {rootMargin: '120px 0px'});
                imgs.forEach(function (i) {
                    lazyObserver.observe(i);
                });
            } else {
                // fallback: ensure images have src already (we set src to dataset earlier)
            }
        }

        // Modal functions: support images and video playback
        function openModal(idx) {
            if (!modal || !photos[idx]) return;
            currentIndex = idx;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            setModalMedia(photos[idx]);
            // focus trap: focus close button
            setTimeout(function () {
                btnClose && btnClose.focus();
            }, 60);
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            if (!modal) return;
            // pause video if playing
            if (modalVideo) {
                try {
                    modalVideo.pause();
                    modalVideo.removeAttribute('src');
                    modalVideo.load();
                } catch (e) {
                }
            }
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            modalImage.src = '';
            currentIndex = -1;
            document.body.style.overflow = '';
        }

        function setModalMedia(p) {
            if (!modalImage || !modalVideo) return;
            // reset both
            modalImage.style.display = '';
            modalImage.src = '';
            modalImage.alt = '';
            // pause and clear any existing video source to stop playback immediately
            try {
                if (modalVideo) {
                    modalVideo.pause();
                    modalVideo.removeAttribute('src');
                    modalVideo.load();
                }
            } catch (e) {
            }
            modalVideo.style.display = 'none';
            modalVideo.setAttribute('aria-hidden', 'true');

            if (p.type === 'video') {
                // show video
                modalVideo.style.display = '';
                modalVideo.setAttribute('aria-hidden', 'false');
                modalVideo.src = p.src || '';
                // set poster if available; otherwise try to generate and set it when ready
                if (p.thumb) {
                    try {
                        modalVideo.poster = p.thumb;
                    } catch (e) {
                    }
                } else {
                    // generate poster for modal if possible
                    generateVideoPoster(p).then(function (dataUrl) {
                        try {
                            modalVideo.poster = dataUrl;
                        } catch (e) {
                        }
                    }).catch(function () {
                    });
                }
                modalVideo.currentTime = 0;
                // try to play (autoplay may be blocked by browser, user can press play)
                var playPromise = modalVideo.play();
                if (playPromise && typeof playPromise.then === 'function') {
                    playPromise.catch(function () { /* autoplay blocked */
                    });
                }
                // focus video for keyboard users (after a short delay to ensure element is focusable)
                setTimeout(function () {
                    try {
                        modalVideo.focus();
                    } catch (e) {
                    }
                }, 80);
            } else {
                // image
                modalImage.style.display = '';
                // always show full `src` in modal
                modalImage.src = p.src || '';
                // use caption as primary alt text per request
                modalImage.alt = p.caption || p.alt || '';
            }
            if (modalCaption) modalCaption.textContent = p.caption || '';
        }

        // Circular navigation: wrap from first->last and last->first
        function showPrev() {
            if (!Array.isArray(photos) || photos.length === 0) return;
            var idx = ((currentIndex - 1) + photos.length) % photos.length;
            openModal(idx);
        }

        function showNext() {
            if (!Array.isArray(photos) || photos.length === 0) return;
            var idx = (currentIndex + 1) % photos.length;
            openModal(idx);
        }

        // Modal button events
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnPrev) btnPrev.addEventListener('click', function () {
            showPrev();
        });
        if (btnNext) btnNext.addEventListener('click', function () {
            showNext();
        });

        // Close modal when clicking backdrop
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }

        // Keyboard support
        document.addEventListener('keydown', function (e) {
            if (!modal || modal.getAttribute('aria-hidden') === 'true') return;
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
        });

        // Initial load
        fetchPhotos();

    })();

})();
