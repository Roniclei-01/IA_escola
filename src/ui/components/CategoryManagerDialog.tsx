import type { StudyCategory } from "../../infrastructure/tauri/study-categories";

interface CategoryManagerDialogProps {
  labels: {
    title: string;
    description: string;
    close: string;
    defaultTitle: string;
    defaultDescription: string;
    defaultCategoryLabel: string;
    defaultSubcategoryLabel: string;
    saveDefault: string;
    savingDefault: string;
    categoryNameLabel: string;
    subcategoriesLabel: string;
    subcategoriesPlaceholder: string;
    saveCategory: string;
    updateCategory: string;
    savingCategory: string;
    clearForm: string;
    editingCategory: (category: string) => string;
    activeCategoriesTitle: string;
    archivedCategoriesTitle: string;
    noActiveCategories: string;
    noArchivedCategories: string;
    categoryUsage: (count: number) => string;
    deleteBlockedTitle: string;
    editCategory: string;
    archiveCategory: string;
    restoreCategory: string;
    deleteCategory: string;
  };
  categoryOptions: string[];
  defaultCategoryDraft: string;
  defaultSubcategoryDraft: string;
  defaultSubcategoryOptions: string[];
  categoryManagerDraftId: string | null;
  categoryManagerNameDraft: string;
  categoryManagerSubcategoriesDraft: string;
  categoryManagerStatus: string | null;
  activeStudyCategories: StudyCategory[];
  archivedStudyCategories: StudyCategory[];
  isSavingStudyCategoryDefault: boolean;
  isSavingStudyCategory: boolean;
  isStudyCategoryDefaultSaveDisabled: boolean;
  isStudyCategorySaveDisabled: boolean;
  getCategoryDisplayName: (category: string) => string;
  getSubcategoryDisplayName: (subcategory: string) => string;
  getLinkedBookCount: (category: StudyCategory) => number;
  onClose: () => void;
  onDefaultCategoryChange: (category: string) => void;
  onDefaultSubcategoryChange: (subcategory: string) => void;
  onCategoryNameChange: (name: string) => void;
  onCategorySubcategoriesChange: (subcategories: string) => void;
  onSaveDefault: () => void;
  onSaveCategory: () => void;
  onClearCategoryForm: () => void;
  onEditCategory: (category: StudyCategory) => void;
  onArchiveCategory: (category: StudyCategory) => void;
  onRestoreCategory: (category: StudyCategory) => void;
  onDeleteCategory: (category: StudyCategory) => void;
}

export function CategoryManagerDialog({
  labels,
  categoryOptions,
  defaultCategoryDraft,
  defaultSubcategoryDraft,
  defaultSubcategoryOptions,
  categoryManagerDraftId,
  categoryManagerNameDraft,
  categoryManagerSubcategoriesDraft,
  categoryManagerStatus,
  activeStudyCategories,
  archivedStudyCategories,
  isSavingStudyCategoryDefault,
  isSavingStudyCategory,
  isStudyCategoryDefaultSaveDisabled,
  isStudyCategorySaveDisabled,
  getCategoryDisplayName,
  getSubcategoryDisplayName,
  getLinkedBookCount,
  onClose,
  onDefaultCategoryChange,
  onDefaultSubcategoryChange,
  onCategoryNameChange,
  onCategorySubcategoriesChange,
  onSaveDefault,
  onSaveCategory,
  onClearCategoryForm,
  onEditCategory,
  onArchiveCategory,
  onRestoreCategory,
  onDeleteCategory
}: CategoryManagerDialogProps) {
  function renderCategoryItem(category: StudyCategory) {
    const linkedBookCount = getLinkedBookCount(category);
    const isDeleteBlocked = linkedBookCount > 0;

    return (
      <li key={category.id}>
        <div>
          <strong>{category.name}</strong>
          <span>{category.subcategories.join(", ")}</span>
          <span>{labels.categoryUsage(linkedBookCount)}</span>
        </div>
        <div className="category-manager-item-actions">
          <button type="button" onClick={() => onEditCategory(category)}>
            {labels.editCategory}
          </button>
          {category.archived ? (
            <button
              type="button"
              onClick={() => {
                onRestoreCategory(category);
              }}
            >
              {labels.restoreCategory}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onArchiveCategory(category);
              }}
            >
              {labels.archiveCategory}
            </button>
          )}
          <button
            type="button"
            disabled={isDeleteBlocked}
            title={isDeleteBlocked ? labels.deleteBlockedTitle : undefined}
            onClick={() => {
              onDeleteCategory(category);
            }}
          >
            {labels.deleteCategory}
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="my-books-overlay" role="presentation">
      <section
        className="my-books-panel category-manager-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
      >
        <div className="my-books-panel-header">
          <div>
            <h2 id="category-manager-title">{labels.title}</h2>
            <span>{labels.description}</span>
          </div>
          <button type="button" aria-label={labels.close} onClick={onClose}>
            x
          </button>
        </div>

        <div className="category-manager-default">
          <div>
            <h3>{labels.defaultTitle}</h3>
            <p>{labels.defaultDescription}</p>
          </div>
          <label htmlFor="default-study-category">
            {labels.defaultCategoryLabel}
            <select
              id="default-study-category"
              value={defaultCategoryDraft}
              disabled={isSavingStudyCategoryDefault}
              onChange={(event) => onDefaultCategoryChange(event.target.value)}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {getCategoryDisplayName(category)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="default-study-subcategory">
            {labels.defaultSubcategoryLabel}
            <select
              id="default-study-subcategory"
              value={defaultSubcategoryDraft}
              disabled={isSavingStudyCategoryDefault}
              onChange={(event) =>
                onDefaultSubcategoryChange(event.target.value)
              }
            >
              {defaultSubcategoryOptions.map((subcategory) => (
                <option key={subcategory} value={subcategory}>
                  {getSubcategoryDisplayName(subcategory)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={isStudyCategoryDefaultSaveDisabled}
            onClick={onSaveDefault}
          >
            {isSavingStudyCategoryDefault
              ? labels.savingDefault
              : labels.saveDefault}
          </button>
        </div>

        <div className="category-manager-form">
          {categoryManagerDraftId ? (
            <p className="category-manager-editing">
              {labels.editingCategory(categoryManagerNameDraft)}
            </p>
          ) : null}
          <label htmlFor="study-category-name">
            {labels.categoryNameLabel}
            <input
              id="study-category-name"
              value={categoryManagerNameDraft}
              disabled={isSavingStudyCategory}
              onChange={(event) => onCategoryNameChange(event.target.value)}
            />
          </label>
          <label htmlFor="study-category-subcategories">
            {labels.subcategoriesLabel}
            <textarea
              id="study-category-subcategories"
              value={categoryManagerSubcategoriesDraft}
              disabled={isSavingStudyCategory}
              placeholder={labels.subcategoriesPlaceholder}
              onChange={(event) =>
                onCategorySubcategoriesChange(event.target.value)
              }
            />
          </label>
          <div className="category-manager-actions">
            <button
              type="button"
              disabled={isStudyCategorySaveDisabled}
              onClick={onSaveCategory}
            >
              {isSavingStudyCategory
                ? labels.savingCategory
                : categoryManagerDraftId
                  ? labels.updateCategory
                  : labels.saveCategory}
            </button>
            <button
              type="button"
              disabled={isSavingStudyCategory}
              onClick={onClearCategoryForm}
            >
              {labels.clearForm}
            </button>
          </div>
          {categoryManagerStatus ? <span role="status">{categoryManagerStatus}</span> : null}
        </div>

        <section className="category-manager-section">
          <h3>{labels.activeCategoriesTitle}</h3>
          {activeStudyCategories.length > 0 ? (
            <ul className="category-manager-list">
              {activeStudyCategories.map(renderCategoryItem)}
            </ul>
          ) : (
            <p>{labels.noActiveCategories}</p>
          )}
        </section>

        <section className="category-manager-section">
          <h3>{labels.archivedCategoriesTitle}</h3>
          {archivedStudyCategories.length > 0 ? (
            <ul className="category-manager-list">
              {archivedStudyCategories.map(renderCategoryItem)}
            </ul>
          ) : (
            <p>{labels.noArchivedCategories}</p>
          )}
        </section>
      </section>
    </div>
  );
}
