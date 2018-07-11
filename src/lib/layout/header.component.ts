import { Component } from '@angular/core';


@Component({
    selector : 'nz-header',
    preserveWhitespaces: false,
    templateUrl: './header.component.html',
    styles: [
        `:host {
            display: block;
        }`
    ],
    host: {
        '[class.mc-layout-header]': 'true'
    }
})
export class McHeaderComponent {
}
