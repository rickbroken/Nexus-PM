import Swal from 'sweetalert2';

// Configuración global de SweetAlert2 para asegurar que esté por encima de los modales
// Los modales de shadcn/ui usan z-50, así que configuramos SweetAlert2 con z-index mucho más alto
Swal.mixin({
  customClass: {
    container: 'swal-high-zindex',
  },
  heightAuto: false, // Previene problemas de scroll
});

// Agregar estilos CSS globales para el z-index
const style = document.createElement('style');
style.innerHTML = `
  /* SweetAlert2 z-index fix - Debe estar por encima de todos los modales */
  .swal2-container {
    z-index: 99999 !important;
  }
  
  .swal2-backdrop-show {
    z-index: 99998 !important;
  }
  
  /* Asegurar que el contenido de SweetAlert2 sea interactivo */
  .swal2-popup {
    z-index: 99999 !important;
    pointer-events: auto !important;
  }
  
  /* Asegurar que los botones de SweetAlert2 sean clickeables */
  .swal2-actions {
    z-index: 100000 !important;
  }
  
  .swal2-confirm,
  .swal2-cancel,
  .swal2-deny {
    z-index: 100000 !important;
    pointer-events: auto !important;
  }
`;
document.head.appendChild(style);

export default Swal;
