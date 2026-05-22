document.addEventListener('DOMContentLoaded', function() {
    
    // Load Components (Navbar & Footer)
    loadComponent('navbar-placeholder', 'components/navbar.html');
    loadComponent('footer-placeholder', 'components/footer.html');

    // Navbar Scroll Effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('show');
        });
    }

    // Number Counter Animation
    const counters = document.querySelectorAll('.counter');
    counters.forEach(counter => {
        counter.innerText = '0';
        const updateCounter = () => {
            const target = +counter.getAttribute('data-target');
            const c = +counter.innerText;
            const increment = target / 200; // Adjust speed here

            if (c < target) {
                counter.innerText = `${Math.ceil(c + increment)}`;
                setTimeout(updateCounter, 10);
            } else {
                counter.innerText = target;
            }
        };
        // Simple Intersection Observer to start animation when visible
        let observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if(entry.isIntersecting){
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        });
        observer.observe(counter);
    });

    // Image Upload Preview
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    if (imageUpload && imagePreview) {
        imageUpload.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.addEventListener('load', function() {
                    imagePreview.src = this.result;
                    imagePreview.style.display = 'block';
                });
                reader.readAsDataURL(file);
            } else {
                imagePreview.style.display = 'none';
            }
        });
    }

    // Form Validation (Simple)
    const forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function (form) {
        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Dummy Chart.js Initialization (If canvas exists)
    initDummyChart();

    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Function to load external HTML components
function loadComponent(id, url) {
    const el = document.getElementById(id);
    if (el) {
        fetch(url)
            .then(response => {
                if(!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(data => {
                el.innerHTML = data;
                // Re-initialize any bootstrap components inside loaded HTML if needed
                const tooltipTriggerList = [].slice.call(el.querySelectorAll('[data-bs-toggle="tooltip"]'))
                tooltipTriggerList.map(function (tooltipTriggerEl) {
                    return new bootstrap.Tooltip(tooltipTriggerEl)
                });
                
                // Initialize Lucide Icons for dynamically loaded content
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            })
            .catch(error => console.error('Error loading component:', error));
    }
}

// Chart.js Dummy Data function
function initDummyChart() {
    const ctx = document.getElementById('laporanChart');
    if (ctx && typeof Chart !== 'undefined') {
        const chartCtx = ctx.getContext('2d');
        
        // Create primary gradient (Indigo-Blue)
        const gradPrimary = chartCtx.createLinearGradient(0, 0, 0, 250);
        gradPrimary.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradPrimary.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
        
        // Create success gradient (Emerald-Green)
        const gradSuccess = chartCtx.createLinearGradient(0, 0, 0, 250);
        gradSuccess.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradSuccess.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                datasets: [{
                    label: 'Laporan Masuk',
                    data: [12, 19, 15, 25, 22, 30],
                    borderColor: '#3b82f6',
                    backgroundColor: gradPrimary,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointHoverRadius: 6,
                    pointRadius: 4
                },
                {
                    label: 'Laporan Selesai',
                    data: [8, 15, 10, 20, 18, 25],
                    borderColor: '#10b981',
                    backgroundColor: gradSuccess,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 6,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: "'Plus Jakarta Sans', 'Inter', sans-serif",
                                weight: 600,
                                size: 12
                            },
                            color: '#64748b',
                            boxWidth: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleFont: {
                            family: "'Plus Jakarta Sans', sans-serif",
                            weight: 700
                        },
                        bodyFont: {
                            family: "'Inter', sans-serif"
                        },
                        padding: 12,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: true,
                            color: '#f1f5f9'
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 11
                            },
                            color: '#64748b'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 11
                            },
                            color: '#64748b'
                        }
                    }
                }
            }
        });
    }
}

// Function to show alert (can be called from forms)
function showAlert(message, type = 'success') {
    const alertPlaceholder = document.getElementById('alertPlaceholder');
    if (alertPlaceholder) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = [
            `<div class="alert alert-${type} alert-dismissible fade show" role="alert">`,
            `   <div>${message}</div>`,
            '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
            '</div>'
        ].join('');
        alertPlaceholder.append(wrapper);
        
        // Auto dismiss after 3 seconds
        setTimeout(() => {
            const alert = bootstrap.Alert.getOrCreateInstance(wrapper.querySelector('.alert'));
            alert.close();
        }, 3000);
    }
}
