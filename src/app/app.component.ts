import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { arrowForward, calendarClearOutline, chevronBack, chevronForward, logoGoogle, trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    addIcons({ arrowForward, calendarClearOutline, chevronBack, chevronForward, logoGoogle, trashOutline });
  }
}
