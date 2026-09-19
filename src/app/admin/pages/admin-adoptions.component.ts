import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  AdminAdoptableCat,
  AdminAdoptableCatAction,
  AdminAdoptableCatStatus,
  AdminAdoptionApplication,
  CreateAdminAdoptableCatRequest,
  UpdateAdminAdoptableCatRequest,
} from '../core/admin-adoption.models';
import { AdminApiService } from '../core/admin-api.service';
import { adminErrorMessage } from '../core/admin-domain-error';
import { AdminFeedbackService } from '../core/admin-feedback';
import { formatAdminDate } from '../core/admin-formatters';
import { AdminCopyIdComponent } from '../shared/admin-copy-id.component';
import { AdminDialogDirective } from '../shared/admin-dialog.directive';
import {
  adoptableCatAgeLabel,
  adoptableCatSexLabel,
} from '../../adoptions/core/adoption-display.utils';

type AdoptionTab = 'cats' | 'applications';
type CatSort = 'displayOrder' | 'name' | 'updatedAt';

interface CatFormModel {
  name: string;
  sex: AdminAdoptableCat['sex'];
  birthDate: string;
  shortDescription: string;
  imageUrl: string;
  status: AdminAdoptableCatStatus;
  published: boolean;
  displayOrder: number;
}

interface ConfirmedCatAction {
  cat: AdminAdoptableCat;
  action: Extract<AdminAdoptableCatAction, 'pause' | 'adopt'>;
}

@Component({
  standalone: true,
  imports: [FormsModule, AdminDialogDirective, AdminCopyIdComponent],
  templateUrl: './admin-adoptions.component.html',
  styleUrls: ['./admin-pages.css', './admin-adoptions.component.css'],
})
export class AdminAdoptionsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly feedback = inject(AdminFeedbackService);

  readonly activeTab = signal<AdoptionTab>('cats');
  readonly cats = signal<AdminAdoptableCat[]>([]);
  readonly applications = signal<AdminAdoptionApplication[]>([]);
  readonly catsLoading = signal(true);
  readonly applicationsLoading = signal(true);
  readonly catsRefreshing = signal(false);
  readonly applicationsRefreshing = signal(false);
  readonly catsError = signal(false);
  readonly applicationsError = signal(false);
  readonly editorCat = signal<AdminAdoptableCat | null | undefined>(undefined);
  readonly detailApplication = signal<AdminAdoptionApplication | null>(null);
  readonly confirmation = signal<ConfirmedCatAction | null>(null);
  readonly busy = signal(false);
  readonly formError = signal<string | null>(null);
  readonly imageFailed = signal(false);

  catSearch = '';
  catStatus: '' | AdminAdoptableCatStatus = '';
  publication: '' | 'published' | 'unpublished' = '';
  catSort: CatSort = 'displayOrder';
  applicationSearch = '';
  formModel: CatFormModel = this.emptyForm();

  ngOnInit(): void {
    this.feedback.clear();
    this.loadCats();
    this.loadApplications();
  }

  loadCats(initial = this.cats().length === 0): void {
    initial ? this.catsLoading.set(true) : this.catsRefreshing.set(true);
    this.catsError.set(false);
    this.api
      .adoptionCats()
      .pipe(
        finalize(() => {
          this.catsLoading.set(false);
          this.catsRefreshing.set(false);
        }),
      )
      .subscribe({
        next: (cats) => this.cats.set(cats),
        error: () => this.catsError.set(true),
      });
  }

  loadApplications(initial = this.applications().length === 0): void {
    initial ? this.applicationsLoading.set(true) : this.applicationsRefreshing.set(true);
    this.applicationsError.set(false);
    this.api
      .adoptionApplications()
      .pipe(
        finalize(() => {
          this.applicationsLoading.set(false);
          this.applicationsRefreshing.set(false);
        }),
      )
      .subscribe({
        next: (applications) => this.applications.set(applications),
        error: () => this.applicationsError.set(true),
      });
  }

  filteredCats(): AdminAdoptableCat[] {
    const search = this.catSearch.trim().toLocaleLowerCase('es');
    return this.cats()
      .filter(
        (cat) =>
          (!search || cat.name.toLocaleLowerCase('es').includes(search)) &&
          (!this.catStatus || cat.status === this.catStatus) &&
          (!this.publication || cat.published === (this.publication === 'published')),
      )
      .sort((left, right) => {
        if (this.catSort === 'name') return left.name.localeCompare(right.name, 'es');
        if (this.catSort === 'updatedAt') {
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }
        return left.displayOrder - right.displayOrder || left.name.localeCompare(right.name, 'es');
      });
  }

  filteredApplications(): AdminAdoptionApplication[] {
    const search = this.applicationSearch.trim().toLocaleLowerCase('es');
    if (!search) return this.applications();
    return this.applications().filter((item) => {
      const applicant = item.application.applicant;
      return [applicant.fullName, applicant.email, applicant.phone, item.interest?.name ?? '']
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(search);
    });
  }

  openCreate(): void {
    this.formModel = this.emptyForm();
    this.imageFailed.set(false);
    this.formError.set(null);
    this.editorCat.set(null);
  }

  openEdit(cat: AdminAdoptableCat): void {
    this.formModel = {
      name: cat.name,
      sex: cat.sex,
      birthDate: cat.birthDate ?? '',
      shortDescription: cat.shortDescription,
      imageUrl: cat.imageUrl,
      status: cat.status,
      published: cat.published,
      displayOrder: cat.displayOrder,
    };
    this.imageFailed.set(false);
    this.formError.set(null);
    this.editorCat.set(cat);
  }

  closeEditor(): void {
    if (!this.busy()) this.editorCat.set(undefined);
  }

  saveCat(): void {
    const validationError = this.validateForm();
    if (validationError) {
      this.formError.set(validationError);
      return;
    }

    const editing = this.editorCat();
    const body = this.normalizedForm();
    const patch = editing ? this.changedFields(editing, body) : null;
    if (editing && patch && Object.keys(patch).length === 0) {
      this.feedback.show('info', 'No había cambios para guardar.');
      this.editorCat.set(undefined);
      return;
    }
    const request = editing
      ? this.api.updateAdoptionCat(editing.id, patch!)
      : this.api.createAdoptionCat(body);

    this.busy.set(true);
    this.formError.set(null);
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.feedback.show(
          'success',
          editing ? `${body.name} fue actualizado correctamente.` : 'Michi creado correctamente.',
        );
        this.editorCat.set(undefined);
        this.loadCats(false);
      },
      error: (error) =>
        this.formError.set(
          adminErrorMessage(
            error,
            'No pudimos guardar el michi. Revisá los datos e intentá nuevamente.',
          ),
        ),
    });
  }

  publish(cat: AdminAdoptableCat): void {
    this.runAction(cat, 'publish', `${cat.name} quedó publicado.`);
  }

  unpublish(cat: AdminAdoptableCat): void {
    this.runUpdate(cat, { published: false }, `${cat.name} dejó de estar publicado.`);
  }

  reserve(cat: AdminAdoptableCat): void {
    this.runAction(cat, 'reserve', `${cat.name} fue marcado en proceso.`);
  }

  makeAvailable(cat: AdminAdoptableCat): void {
    this.runUpdate(cat, { status: 'AVAILABLE' }, `${cat.name} volvió a estar disponible.`);
  }

  requestConfirmation(cat: AdminAdoptableCat, action: 'pause' | 'adopt'): void {
    this.confirmation.set({ cat, action });
  }

  confirmAction(): void {
    const confirmation = this.confirmation();
    if (!confirmation) return;
    const message =
      confirmation.action === 'adopt'
        ? `${confirmation.cat.name} fue marcado como adoptado.`
        : 'Publicación pausada.';
    this.runAction(confirmation.cat, confirmation.action, message, () =>
      this.confirmation.set(null),
    );
  }

  statusLabel(status: AdminAdoptableCatStatus): string {
    return {
      AVAILABLE: 'Disponible',
      RESERVED: 'En proceso',
      PAUSED: 'Pausado',
      ADOPTED: 'Adoptado',
    }[status];
  }

  sexLabel(sex: AdminAdoptableCat['sex']): string {
    return adoptableCatSexLabel(sex);
  }

  ageLabel(birthDate: string | null): string {
    return birthDate ? adoptableCatAgeLabel(birthDate) : 'Edad no informada';
  }

  date(value: string | null): string {
    return formatAdminDate(value);
  }

  yesNo(value: boolean | undefined): string {
    return value === undefined ? 'No informado' : value ? 'Sí' : 'No';
  }

  housingLabel(value: string): string {
    return { owned: 'Propia', rented: 'Alquilada', other: 'Otra' }[value] ?? value;
  }

  safetyLabel(value: string): string {
    return (
      {
        protected: 'Ya cuenta con protección',
        will_install: 'Se compromete a instalarla',
        no: 'No cuenta con protección',
        not_applicable: 'No aplica',
      }[value] ?? value
    );
  }

  private runAction(
    cat: AdminAdoptableCat,
    action: AdminAdoptableCatAction,
    successMessage: string,
    onSuccess?: () => void,
  ): void {
    this.runMutation(this.api.setAdoptionCatState(cat.id, action), successMessage, onSuccess);
  }

  private runUpdate(
    cat: AdminAdoptableCat,
    body: UpdateAdminAdoptableCatRequest,
    successMessage: string,
  ): void {
    this.runMutation(this.api.updateAdoptionCat(cat.id, body), successMessage);
  }

  private runMutation(
    request: ReturnType<AdminApiService['updateAdoptionCat']>,
    successMessage: string,
    onSuccess?: () => void,
  ): void {
    this.busy.set(true);
    this.feedback.clear();
    request.pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        onSuccess?.();
        this.feedback.show('success', successMessage);
        this.loadCats(false);
      },
      error: (error) =>
        this.feedback.show(
          'error',
          adminErrorMessage(error, 'No pudimos completar la acción. Intentá nuevamente.'),
        ),
    });
  }

  private validateForm(): string | null {
    if (!this.formModel.name.trim()) return 'Ingresá el nombre del michi.';
    if (this.formModel.name.trim().length > 100) return 'El nombre admite hasta 100 caracteres.';
    const descriptionLength = this.formModel.shortDescription.trim().length;
    if (descriptionLength < 2 || descriptionLength > 500) {
      return 'La descripción debe tener entre 2 y 500 caracteres.';
    }
    try {
      const url = new URL(this.formModel.imageUrl.trim());
      if (url.protocol !== 'https:') throw new Error('HTTPS required');
    } catch {
      return 'Ingresá una URL de imagen HTTPS válida.';
    }
    if (!Number.isInteger(this.formModel.displayOrder))
      return 'El orden debe ser un número entero.';
    if (this.formModel.displayOrder < -10_000 || this.formModel.displayOrder > 10_000) {
      return 'El orden debe estar entre -10000 y 10000.';
    }
    return null;
  }

  private normalizedForm(): CreateAdminAdoptableCatRequest {
    return {
      name: this.formModel.name.trim(),
      sex: this.formModel.sex,
      birthDate: this.formModel.birthDate || null,
      shortDescription: this.formModel.shortDescription.trim(),
      imageUrl: this.formModel.imageUrl.trim(),
      status: this.formModel.status,
      published: this.formModel.published,
      displayOrder: this.formModel.displayOrder,
    };
  }

  private changedFields(
    cat: AdminAdoptableCat,
    body: CreateAdminAdoptableCatRequest,
  ): UpdateAdminAdoptableCatRequest {
    const patch: UpdateAdminAdoptableCatRequest = {};
    const keys = [
      'name',
      'sex',
      'birthDate',
      'shortDescription',
      'imageUrl',
      'published',
      'displayOrder',
    ] as const;
    for (const key of keys) {
      if (body[key] !== cat[key]) Object.assign(patch, { [key]: body[key] });
    }
    return patch;
  }

  private emptyForm(): CatFormModel {
    return {
      name: '',
      sex: 'FEMALE',
      birthDate: '',
      shortDescription: '',
      imageUrl: '',
      status: 'AVAILABLE',
      published: false,
      displayOrder: 0,
    };
  }
}
