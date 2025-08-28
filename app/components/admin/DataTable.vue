<template>
  <div class="data-table">
    <!-- Table Header -->
    <div class="d-flex align-center mb-4">
      <div class="text-h6">{{ title }}</div>
      <v-spacer />

      <!-- Search -->
      <v-text-field
        v-if="showSearch"
        v-model="search"
        append-inner-icon="mdi-magnify"
        label="Search"
        single-line
        hide-details
        density="compact"
        class="table-search"
        @update:model-value="handleSearch"
      />

      <!-- Actions -->
      <v-btn
        v-if="showExport"
        prepend-icon="mdi-download"
        variant="text"
        class="ml-2"
        @click="exportData"
      >
        Export
      </v-btn>

      <v-btn
        v-if="showAdd"
        color="primary"
        prepend-icon="mdi-plus"
        class="ml-2"
        @click="$emit('add')"
      >
        Add New
      </v-btn>
    </div>

    <!-- Filters -->
    <div v-if="showFilters" class="mb-4">
      <v-expand-transition>
        <div v-show="showFilterPanel">
          <v-card>
            <v-card-text>
              <v-row dense>
                <v-col
                  v-for="filter in filters"
                  :key="filter.key"
                  :cols="12"
                  :sm="filter.type === 'date-range' ? 6 : 3"
                >
                  <template v-if="filter.type === 'select'">
                    <v-select
                      v-model="activeFilters[filter.key]"
                      :items="filter.options"
                      :label="filter.label"
                      clearable
                      density="compact"
                      variant="outlined"
                    />
                  </template>

                  <template v-else-if="filter.type === 'date-range'">
                    <v-text-field
                      v-model="activeFilters[`${filter.key}Start`]"
                      :label="filter.label + ' From'"
                      type="date"
                      density="compact"
                      variant="outlined"
                    />
                  </template>

                  <template v-else>
                    <v-text-field
                      v-model="activeFilters[filter.key]"
                      :label="filter.label"
                      :type="filter.type"
                      density="compact"
                      variant="outlined"
                      clearable
                    />
                  </template>
                </v-col>
              </v-row>

              <div class="d-flex justify-end mt-2">
                <v-btn
                  variant="text"
                  @click="clearFilters"
                >
                  Clear
                </v-btn>
                <v-btn
                  color="primary"
                  class="ml-2"
                  @click="applyFilters"
                >
                  Apply
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-expand-transition>

      <v-btn
        variant="text"
        :prepend-icon="showFilterPanel ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        @click="showFilterPanel = !showFilterPanel"
      >
        {{ showFilterPanel ? 'Hide' : 'Show' }} Filters
      </v-btn>
    </div>

    <!-- Table -->
    <v-data-table
      v-model:items-per-page="itemsPerPage"
      :headers="headers"
      :items="items"
      :loading="loading"
      :search="search"
      class="elevation-1"
    >
      <!-- Custom Column Slots -->
      <template
        v-for="header in headers"
        :key="header.key"
        #[`item.${header.key}`]="{ item }"
      >
        <slot
          :name="`column-${header.key}`"
          :item="item"
          :value="item[header.key]"
        >
          {{ item[header.key] }}
        </slot>
      </template>

      <!-- Actions Column -->
      <template #item.actions="{ item }">
        <slot name="actions" :item="item">
          <v-btn
            v-if="showEdit"
            icon="mdi-pencil"
            variant="text"
            size="small"
            @click="$emit('edit', item)"
          />
          <v-btn
            v-if="showDelete"
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            @click="confirmDelete(item)"
          />
        </slot>
      </template>

      <!-- Empty State -->
      <template #no-data>
        <v-alert
          type="info"
          variant="tonal"
          class="ma-2"
        >
          No data available
        </v-alert>
      </template>
    </v-data-table>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete this item? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="error"
            @click="handleDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  headers: {
    type: Array,
    required: true
  },
  items: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  showSearch: {
    type: Boolean,
    default: true
  },
  showExport: {
    type: Boolean,
    default: true
  },
  showAdd: {
    type: Boolean,
    default: true
  },
  showEdit: {
    type: Boolean,
    default: true
  },
  showDelete: {
    type: Boolean,
    default: true
  },
  showFilters: {
    type: Boolean,
    default: true
  },
  filters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['search', 'filter', 'export', 'add', 'edit', 'delete'])

const search = ref('')
const itemsPerPage = ref(10)
const showFilterPanel = ref(false)
const showDeleteDialog = ref(false)
const selectedItem = ref(null)
const activeFilters = ref({})

const handleSearch = (value: string) => {
  emit('search', value)
}

const clearFilters = () => {
  activeFilters.value = {}
  emit('filter', {})
}

const applyFilters = () => {
  emit('filter', activeFilters.value)
}

const confirmDelete = (item: any) => {
  selectedItem.value = item
  showDeleteDialog.value = true
}

const handleDelete = () => {
  emit('delete', selectedItem.value)
  showDeleteDialog.value = false
  selectedItem.value = null
}

const exportData = () => {
  emit('export', {
    items: props.items,
    filters: activeFilters.value,
    search: search.value
  })
}

// Initialize filters
onMounted(() => {
  if (props.filters) {
    props.filters.forEach(filter => {
      if (filter.type === 'date-range') {
        activeFilters.value[`${filter.key}Start`] = ''
        activeFilters.value[`${filter.key}End`] = ''
      } else {
        activeFilters.value[filter.key] = ''
      }
    })
  }
})
</script>

<style scoped>
.data-table {
  width: 100%;
}

.table-search {
  max-width: 300px;
}

:deep(.v-data-table) {
  border-radius: 8px;
}

:deep(.v-data-table-header) {
  background-color: #f5f5f5;
}
</style>
