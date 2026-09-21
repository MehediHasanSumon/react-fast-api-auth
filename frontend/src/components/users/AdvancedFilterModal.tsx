import React, { useState } from 'react'
import { Filter, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import {
  DEFAULT_FILTER_CRITERIA,
  type UserFilterCriteria,
} from '../../data/mockUsers'

interface AdvancedFilterModalProps {
  isOpen: boolean
  onClose: () => void
  currentFilters: UserFilterCriteria
  onApplyFilters: (filters: UserFilterCriteria) => void
  onResetFilters: () => void
}

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Active', label: 'Active Only' },
  { value: 'Inactive', label: 'Inactive Only' },
  { value: 'Suspended', label: 'Suspended Only' },
]

const VERIFICATION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Verification Statuses' },
  { value: 'VERIFIED', label: 'Verified Accounts Only' },
  { value: 'UNVERIFIED', label: 'Unverified Accounts Only' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Joined Date: Newest First' },
  { value: 'oldest', label: 'Joined Date: Oldest First' },
  { value: 'name-asc', label: 'Full Name: A to Z' },
  { value: 'name-desc', label: 'Full Name: Z to A' },
]

const FilterForm: React.FC<{
  initialFilters: UserFilterCriteria
  onClose: () => void
  onApplyFilters: (filters: UserFilterCriteria) => void
  onResetFilters: () => void
}> = ({ initialFilters, onClose, onApplyFilters, onResetFilters }) => {
  const [draftFilters, setDraftFilters] = useState<UserFilterCriteria>(initialFilters)

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    onApplyFilters(draftFilters)
    onClose()
  }

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTER_CRITERIA)
    onResetFilters()
    onClose()
  }

  return (
    <form onSubmit={handleApply} className="space-y-4 pt-1">
      {/* Status Filter */}
      <Select
        label="Account Status"
        options={STATUS_FILTER_OPTIONS}
        value={draftFilters.status}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            status: e.target.value as UserFilterCriteria['status'],
          }))
        }
      />

      {/* Verification Filter */}
      <Select
        label="Verification Status"
        options={VERIFICATION_FILTER_OPTIONS}
        value={draftFilters.isVerified}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            isVerified: e.target.value as UserFilterCriteria['isVerified'],
          }))
        }
      />

      {/* Sorting Order */}
      <Select
        label="Sort Order"
        options={SORT_OPTIONS}
        value={draftFilters.sortBy}
        onChange={(e) =>
          setDraftFilters((prev) => ({
            ...prev,
            sortBy: e.target.value as UserFilterCriteria['sortBy'],
          }))
        }
      />

      {/* Modal Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Reset Filters
        </Button>

        <div className="flex items-center gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </form>
  )
}

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Advanced User Filtering"
      description="Refine user accounts by account status, verification state, and sort sequence."
      icon={<SlidersHorizontal className="w-5 h-5" />}
      maxWidth="md"
    >
      {isOpen && (
        <FilterForm
          key={JSON.stringify(currentFilters)}
          initialFilters={currentFilters}
          onClose={onClose}
          onApplyFilters={onApplyFilters}
          onResetFilters={onResetFilters}
        />
      )}
    </Dialog>
  )
}
