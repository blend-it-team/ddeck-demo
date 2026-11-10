/**
 * @file
 * Instantiates ApexCharts from chart markup.
 */

(function (Drupal, once) {

  Drupal.behaviors.ddeckApexchart = {
    attach(context) {
      once('ddeck-apexchart', '.apexchart', context).forEach((element) => {
        if (typeof ApexCharts === 'undefined') {
          return;
        }

        let options = {};
        try {
          options = JSON.parse(element.dataset.chartOptions || '{}');
        }
        catch {
          return;
        }

        if (!options || typeof options !== 'object' || Array.isArray(options)) {
          options = {};
        }
        if (!options.chart || typeof options.chart !== 'object' || Array.isArray(options.chart)) {
          options.chart = {};
        }
        if (options.chart.height == null && element.style.height) {
          options.chart.height = element.style.height;
        }
        if (!options.theme || typeof options.theme !== 'object' || Array.isArray(options.theme)) {
          options.theme = {};
        }
        // Explicit colors and theme.mode win over tokens. When neither is set,
        // follow Bootstrap's data-bs-theme so tooltips match the page.
        if ((options.theme.mode == null || options.theme.mode === '') && !options.colors) {
          const themeHost = element.closest('[data-bs-theme]') || document.documentElement;
          const bsTheme = themeHost.getAttribute('data-bs-theme');
          if (bsTheme === 'dark' || bsTheme === 'light') {
            options.theme.mode = bsTheme;
          }
        }

        const chart = new ApexCharts(element, options);
        chart.render();
      });
    },
  };

})(Drupal, once);
