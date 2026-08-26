// Aplica el modo oscuro guardado antes de renderizar (evita el destello claro).
// Está en un archivo aparte, y no dentro del HTML, para que la política de
// seguridad (CSP) pueda prohibir todo script inline sin excepciones.
try {
  if (localStorage.getItem('dicor-tema') === 'oscuro') {
    document.documentElement.classList.add('dark')
  }
} catch (e) {
  /* modo incógnito: se usa el tema claro */
}
