import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EMPTY, Observable, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { catchError, takeUntil } from 'rxjs/operators';

import { AuthService } from '../../services/auth/auth.service';
import { FEED } from '../../consts/routes.const';
import { MEDIA_STORAGE_PATH } from '../../consts/storage.const';
import { StorageService } from '../../services/storage/storage.service';
import { UtilService } from '../../services/util/util.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
})
export class CreateComponent implements OnInit, OnDestroy {
  destroy$: Subject<null> = new Subject();
  fileToUpload: File;
  kittyImagePreview: string | ArrayBuffer;
  pictureForm: FormGroup;
  submitted = false;
  uploadProgress$: Observable<number>;
  user: firebase.User;

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly storageService: StorageService,
    private readonly utilService: UtilService,
  ) {}

  ngOnInit(): void {
    this.pictureForm = this.formBuilder.group({
      photo: [null, [Validators.required, this.image.bind(this)]],
      description: [null, Validators.required],
    });
    this.authService.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => (this.user = user));

    this.pictureForm
      .get('photo')
      .valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((newValue) => {
        this.handleFileChange(newValue.files);
      });
  }

  handleFileChange([kittyImage]) {
    this.fileToUpload = kittyImage;
    const reader = new FileReader();
    reader.onload = (loadEvent) => (this.kittyImagePreview = loadEvent.target.result);
    reader.readAsDataURL(kittyImage);
  }

  postKitty() {
    this.submitted = true;
    const mediaFolderPath = `${MEDIA_STORAGE_PATH}/${this.user.email}/media/`;

    const { downloadUrl$, uploadProgress$ } = this.storageService.uploadFileAndGetMetadata(
      mediaFolderPath,
      this.fileToUpload,
    );

    this.uploadProgress$ = uploadProgress$;

    downloadUrl$
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.snackBar.open(`${error.message} 😢`, 'Close', {
            duration: 4000,
          });
          return EMPTY;
        }),
      )
      .subscribe((downloadUrl) => {
        this.submitted = false;
        this.router.navigate([`/${FEED}`]);
      });
  }

  ngOnDestroy() {
    this.destroy$.next(null);
  }

  private image(photoControl: AbstractControl): { [key: string]: boolean } | null {
    if (photoControl.value) {
      const [kittyImage] = photoControl.value.files;
      return this.utilService.validateFile(kittyImage)
        ? null
        : {
            image: true,
          };
    }
    return;
  }
}
