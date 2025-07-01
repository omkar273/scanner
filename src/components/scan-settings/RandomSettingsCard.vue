<template>
  <n-card
    :segmented="{
      content: true,
      footer: 'soft'
    }"
  >
    <n-collapse :default-expanded-names="randomSettings.enabled ? ['RandomSettings'] : []">
      <template #header-extra>
        <n-icon><ChevronDown12Regular /></n-icon>
      </template>
      <template #arrow>
        <n-icon style="margin-right: 2px">
          <Shuffle />
        </n-icon>
      </template>
      <n-collapse-item :title="t('settings.randomSettings')" name="RandomSettings">
        <n-space vertical>
          <n-switch v-model:value="randomSettings.enabled">
            <template #checked>{{ t('settings.randomEnabled') }}</template>
            <template #unchecked>{{ t('settings.randomDisabled') }}</template>
          </n-switch>

          <div v-if="randomSettings.enabled">
            <n-divider>{{ t('settings.randomRanges') }}</n-divider>

            <!-- Rotate Range -->
            <n-form-item :label="t('settings.rotate')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.rotate.min"
                  :min="-5"
                  :max="5"
                  :step="0.1"
                  :precision="1"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.rotate.max"
                  :min="-5"
                  :max="5"
                  :step="0.1"
                  :precision="1"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Rotate Variance Range -->
            <n-form-item :label="t('settings.rotateVariance')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.rotate_var.min"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :precision="1"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.rotate_var.max"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :precision="1"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Brightness Range -->
            <n-form-item :label="t('settings.brightness')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.brightness.min"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  :precision="2"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.brightness.max"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  :precision="2"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Contrast Range -->
            <n-form-item :label="t('settings.contrast')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.contrast.min"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  :precision="2"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.contrast.max"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  :precision="2"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Blur Range -->
            <n-form-item :label="t('settings.blur')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.blur.min"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  :precision="2"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.blur.max"
                  :min="0"
                  :max="2"
                  :step="0.01"
                  :precision="2"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Noise Range -->
            <n-form-item :label="t('settings.noise')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.noise.min"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.noise.max"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Scale Range -->
            <n-form-item :label="t('settings.scale')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.scale.min"
                  :min="1"
                  :max="3"
                  :step="0.1"
                  :precision="1"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.scale.max"
                  :min="1"
                  :max="3"
                  :step="0.1"
                  :precision="1"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Yellowish Range -->
            <n-form-item :label="t('settings.yellowish')" :show-feedback="false">
              <n-space>
                <n-input-number
                  v-model:value="randomSettings.ranges.yellowish.min"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  placeholder="Min"
                  style="width: 100px"
                />
                <n-input-number
                  v-model:value="randomSettings.ranges.yellowish.max"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  placeholder="Max"
                  style="width: 100px"
                />
              </n-space>
            </n-form-item>

            <!-- Boolean Options -->
            <n-divider>{{ t('settings.randomOptions') }}</n-divider>
            <n-space>
              <n-checkbox v-model:checked="randomSettings.ranges.border">
                {{ t('settings.randomBorder') }}
              </n-checkbox>
              <n-checkbox v-model:checked="randomSettings.ranges.colorspace">
                {{ t('settings.randomColorspace') }}
              </n-checkbox>
            </n-space>
          </div>
        </n-space>
      </n-collapse-item>
    </n-collapse>
  </n-card>
</template>

<script lang="ts" setup>
import {
  NCard,
  NCollapse,
  NCollapseItem,
  NIcon,
  NSpace,
  NSwitch,
  NFormItem,
  NInputNumber,
  NDivider,
  NCheckbox
} from 'naive-ui'
import { ChevronDown12Regular } from '@vicons/fluent'
import { Shuffle } from '@vicons/carbon'
import { useI18n } from 'vue-i18n'
import { useVModel } from '@vueuse/core'
import type { RandomConfigRanges } from '@/utils/random-config'

const { t } = useI18n()

interface RandomSettings {
  enabled: boolean
  ranges: RandomConfigRanges
}

const props = defineProps<{
  randomSettings: RandomSettings
}>()

const emit = defineEmits<{
  (e: 'update:randomSettings', value: RandomSettings): void
}>()

const randomSettings = useVModel(props, 'randomSettings', emit)
</script>
