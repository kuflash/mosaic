import { Component } from '@angular/core';


@Component({
    selector: 'mc-sidebar',
    preserveWhitespaces: false,
    templateUrl: './sidebar.component.html',
    host               : {
        '[class.mc-layout-sidebar]': 'true'
    }
})
export class McSidebarComponent {

}
