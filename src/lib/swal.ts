import Swal from 'sweetalert2';

/**
 * Configuración global de SweetAlert2 con z-index correcto
 * para asegurar que siempre esté por encima de los modales
 */
const swalWithConfig = Swal.mixin({
  customClass: {
    container: 'swal2-container-custom',
    popup: 'swal2-popup-custom',
  },
  // Asegurar que el backdrop también tenga el z-index correcto
  backdrop: true,
  // Permitir clicks fuera del modal de SweetAlert
  allowOutsideClick: true,
});

export default swalWithConfig;
