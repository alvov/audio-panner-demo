/**
 * Provides methods for creating html for repetitive form elements from given options
 */
class FormBuilder {
    static legend(name) {
        return `<legend class="controls-legend">${name}</legend>`;
    }

    static label({ id, name, star = 0 }) {
        return `<label class="controls-fieldset-row-label" for="${id}">${name}${'*'.repeat(star)}</label>`;
    }

    static number({ id, attributes }) {
         return `<input class="controls-fieldset-row-input" type="number" name="${id}" id="${id}" ${attributes}>`;
    }

    static select({ id, options }) {
        return `<select class="controls-fieldset-row-select" name="${id}" id="${id}">` +
            options.map(option => `<option value="${option}">${option}</option>`).join('') +
        '</select>';
    }

    static row(params) {
        const { id, name, type, star, attributes } = params;
        return '<div class="controls-fieldset-row">' +
            FormBuilder.label({ id, name, star }) +
            (
                type === 'select' ?
                    FormBuilder.select({ id, options: params.options }) :
                    FormBuilder.number({ id, attributes })
            ) +
        '</div>';
    }

    static fieldset({ name, id, rows }) {
        return `<fieldset class="controls-fieldset controls-fieldset_${id}">` +
            FormBuilder.legend(name) +
            rows.map(row => FormBuilder.row(Object.assign({ id: `${id}-${row.name}` }, row ))).join('') +
        '</fieldset>';
    }

    static render(html) {
        document.write(html);
    }
}
